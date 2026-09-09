// 0.10.14 is a published browser package version on jsDelivr. Keep the JS and
// WASM versions identical: the task runtime requires matching binaries.
import { FaceLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
export class EyeTracker {
  constructor(video,canvas,onFrame,onStatus){this.video=video;this.canvas=canvas;this.ctx=canvas.getContext('2d');this.onFrame=onFrame;this.onStatus=onStatus;this.last=0;}
  async init(){this.onStatus('Loading eye tracking model…');const vision=await FilesetResolver.forVisionTasks(WASM);const options={baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false};try{this.landmarker=await FaceLandmarker.createFromOptions(vision,options);}catch(error){options.baseOptions.delegate='CPU';this.landmarker=await FaceLandmarker.createFromOptions(vision,options);}}
  start(){const loop=(time)=>{if(this.video.readyState>=2&&time-this.last>33){this.last=time;const r=this.landmarker.detectForVideo(this.video,time);const landmarks=r.faceLandmarks?.[0];this.draw(landmarks);this.onFrame(landmarks);}requestAnimationFrame(loop)};requestAnimationFrame(loop);}
  draw(points){const c=this.canvas,v=this.video;if(c.width!==v.videoWidth){c.width=v.videoWidth;c.height=v.videoHeight}this.ctx.clearRect(0,0,c.width,c.height);if(!points)return;this.ctx.strokeStyle='#00ffac';this.ctx.lineWidth=4;for(const group of [[468,469,470,471,472],[473,474,475,476,477]]){const pts=group.map(i=>points[i]);const x=pts.reduce((s,p)=>s+p.x,0)/pts.length*c.width,y=pts.reduce((s,p)=>s+p.y,0)/pts.length*c.height;const radius=Math.max(...pts.map(p=>Math.hypot(p.x*c.width-x,p.y*c.height-y)))+8;this.ctx.beginPath();this.ctx.arc(x,y,radius,0,Math.PI*2);this.ctx.stroke();}}
}
