import { startCamera } from './camera.js';
import { EyeTracker } from './eyeTracking.js';
import { estimateGaze,getDirection,smoothGaze } from './gazeEstimator.js';
import { Calibration,mapGaze } from './calibration.js';
import { DwellSelection } from './dwellSelection.js';
import { getSuggestions } from './suggestions.js';
import { getGeminiSuggestions } from './geminiSuggestions.js?v=20260906-11';
import { TEMP_GEMINI_API_KEY } from './geminiConfig.js';
import { TextToSpeech } from './textToSpeech.js';
import { SpeechRecognition } from './speechRecognition.js';
import { setupSettings } from './settings.js';
let words=['YES','NO','HELP','WATER','FOOD','SLEEP','PAIN','BATHROOM','THANK YOU','HOME','DOCTOR','FAMILY'];
const video=document.querySelector('#webcam'), sentenceEl=document.querySelector('#sentence'), status=document.querySelector('#trackingStatus'), cameraMsg=document.querySelector('#cameraMessage'), cursor=document.querySelector('#gazeCursor'),debug=document.querySelector('#debugPanel');
let sentence='', listeningText='', model=JSON.parse(localStorage.getItem('eyeVoiceCalibration')||'null'), latestGaze=null,smoothedGaze=null,previousGaze=null,stableDirection='CENTER',frames=0,lastFps=performance.now(),fps=0;
let quickIndex=0;
const settings=setupSettings(()=>calibration.start()); const tts=new TextToSpeech(); document.querySelector('#language').onchange=()=>tts.populate();
const geminiKeyInput=document.querySelector('#geminiApiKey');
geminiKeyInput.value=sessionStorage.getItem('eyeVoiceGeminiApiKey')||TEMP_GEMINI_API_KEY;
geminiKeyInput.onchange=()=>sessionStorage.setItem('eyeVoiceGeminiApiKey',geminiKeyInput.value.trim());
function setStatus(message,error=false){status.textContent=`● ${message}`;status.classList.toggle('error',error);cameraMsg.textContent=message;}
function carousel(containerId,items,index,type){const container=document.querySelector(containerId);if(!items.length)return;const current=items[(index+items.length)%items.length];container.innerHTML=`<button class="carousel-control" data-gaze-target data-carousel="${type}" data-step="-1" aria-label="Previous word">←</button><div class="carousel-word" aria-live="polite">${current}</div><button class="carousel-control" data-gaze-target data-carousel="${type}" data-step="1" aria-label="Next word">→</button>`;}
function renderWords(){quickIndex=(quickIndex+words.length)%words.length;carousel('#quickCarousel',words,quickIndex,'quick');document.querySelector('#quickCarousel').closest('section').classList.add('active-carousel');if(sentenceEl)sentenceEl.textContent=sentence||'…';}
function addWord(word){sentence=word;listeningText='';renderWords();tts.speak(sentence);}
function toggleListening(){recognition.toggle(document.querySelector('#language').value);}
function action(target){if(target.dataset.direction){const direction=target.dataset.direction;if(direction==='UP'){toggleListening();return;}if(direction==='LEFT'){quickIndex=(quickIndex-1+words.length)%words.length;renderWords();return;}if(direction==='RIGHT'){quickIndex=(quickIndex+1)%words.length;renderWords();return;}if(direction==='DOWN'){addWord(words[quickIndex]);return;}return;}if(target.dataset.carousel){if(target.dataset.step){quickIndex=(quickIndex+Number(target.dataset.step)+words.length)%words.length;renderWords();}else if(target.dataset.select)addWord(words[quickIndex]);}else if(target.dataset.action==='listen')toggleListening();else if(target.dataset.action==='clear'){sentence='';listeningText='';speechSynthesis.cancel();document.querySelector('#listenResult').textContent='';renderWords();}else if(target.id==='recalibrate')calibration.start();}
const dwell=new DwellSelection(action,target=>Number(target?.dataset.dwellMs)||settings.dwell);
const recognition=new SpeechRecognition({
  onTranscript:text=>{listeningText=text;document.querySelector('#listenResult').textContent=text;},
  onStatus:text=>document.querySelector('#listenResult').textContent=text,
  onComplete:async text=>{
    if(!text){document.querySelector('#listenResult').textContent='Nothing was heard. Try listening again.';return;}
    document.querySelector('#listenResult').textContent='Creating suggestions…';
    try{words=await getGeminiSuggestions(text,document.querySelector('#language').value,geminiKeyInput.value);quickIndex=0;renderWords();document.querySelector('#listenResult').textContent=`Suggestions for: ${text}`;}
    catch(error){words=getSuggestions(sentence,text);quickIndex=0;renderWords();document.querySelector('#listenResult').textContent=`${error.message} Showing local suggestions for: ${text}`;}
  }
});
const calibration=new Calibration(newModel=>{model=newModel;setStatus('TRACKING ACTIVE');});
function focusedTarget(pos){const el=document.elementFromPoint(pos.x,pos.y);return el?.closest?.('[data-gaze-target]')||null;}
function updateDirections(dir){document.querySelectorAll('[data-direction]').forEach(el=>el.classList.toggle('active',el.dataset.direction===dir));}
function onFrame(points){frames++;const now=performance.now();if(now-lastFps>1000){fps=Math.round(frames*1000/(now-lastFps));frames=0;lastFps=now}if(!points){setStatus('FACE NOT DETECTED');dwell.clear();return;}const rawGaze=estimateGaze(points);if(!rawGaze){setStatus('MOVE CLOSER / IMPROVE LIGHTING');return;}const alpha=settings.sensitivity==='high'?.42:settings.sensitivity==='low'?.18:.28;const gaze=smoothGaze(rawGaze,smoothedGaze,alpha);smoothedGaze=gaze;latestGaze=gaze;calibration.add(gaze);const threshold=settings.sensitivity==='high'?.07:settings.sensitivity==='low'?.16:.11;setStatus(calibration.active?'CALIBRATING…':'TRACKING ACTIVE');const pos=mapGaze(gaze,model);const directionGaze=pos?{x:pos.x/innerWidth,y:pos.y/innerHeight}:gaze;const dir=getDirection(directionGaze,threshold,stableDirection);stableDirection=dir;updateDirections(dir);const movement=previousGaze?Math.hypot(gaze.x-previousGaze.x,gaze.y-previousGaze.y):1;previousGaze=gaze;if(pos&&!calibration.active){cursor.style.left=`${pos.x}px`;cursor.style.top=`${pos.y}px`;cursor.style.width='30px';cursor.style.height='30px';cursor.style.margin='-15px 0 0 -15px';cursor.classList.toggle('gaze-stable',movement<.012);const directionControl=dir==='CENTER'?null:document.querySelector(`.direction[data-direction="${dir}"]`);dwell.update(directionControl,now);}else dwell.clear();debug.textContent=`Face detected: YES\nLeft iris X: ${gaze.left.iris.x.toFixed(3)}\nLeft iris Y: ${gaze.left.iris.y.toFixed(3)}\nRight iris X: ${gaze.right.iris.x.toFixed(3)}\nRight iris Y: ${gaze.right.iris.y.toFixed(3)}\nGaze X: ${gaze.x.toFixed(3)}\nGaze Y: ${gaze.y.toFixed(3)}\nDirection: ${dir}\nFPS: ${fps}\nTracking confidence: ${movement<.012?'good':'moving'}`}
renderWords(); document.querySelector('#debugToggle').onclick=()=>debug.hidden=!debug.hidden;
function flashSelected(target){target.classList.add('selected');setTimeout(()=>target.classList.remove('selected'),500);}
document.querySelector('#app').addEventListener('click',e=>{const target=e.target.closest('[data-gaze-target]');if(!target)return;dwell.clear();flashSelected(target);action(target);});
document.querySelector('#app').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const target=e.target.closest('[data-gaze-target]');if(!target||target.tagName==='BUTTON')return;e.preventDefault();dwell.clear();flashSelected(target);action(target);});
document.querySelector('#startTracking').onclick=async()=>{const msg=document.querySelector('#permissionMessage'),permission=document.querySelector('#permissionScreen'),app=document.querySelector('#app');try{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access is not available in this browser.');permission.hidden=true;app.hidden=false;setStatus('REQUESTING CAMERA ACCESS…');await startCamera(video);setStatus('LOADING EYE-TRACKING MODEL…');const tracker=new EyeTracker(video,document.querySelector('#landmarkCanvas'),onFrame,setStatus);try{await tracker.init();tracker.start();if(!model)setTimeout(()=>calibration.start(),500);}catch(e){setStatus('EYE-TRACKING MODEL COULD NOT LOAD',true);cameraMsg.textContent='Check your internet connection, then refresh. Camera video remains local.';console.error('MediaPipe model startup failed:',e);}}catch(e){app.hidden=true;permission.hidden=false;msg.textContent=e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access and try again.':`Unable to start camera: ${e.message}`;}};
