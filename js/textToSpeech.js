export class TextToSpeech {
  constructor(){this.select=document.querySelector('#voiceSelect');this.language=document.querySelector('#language');this.voices=[];speechSynthesis.onvoiceschanged=()=>this.populate();this.populate();}
  populate(){this.voices=speechSynthesis.getVoices();this.select.innerHTML='';this.voices.filter(v=>v.lang.startsWith(this.language.value.slice(0,2))).forEach((v,i)=>this.select.add(new Option(v.name,i)));if(!this.select.options.length)this.select.add(new Option('System default',''));}
  speak(text){if(!text.trim())return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=this.language.value;const v=this.voices[Number(this.select.value)];if(v)u.voice=v;speechSynthesis.speak(u);}
}
