const POINTS = [[.08,.12],[.5,.12],[.92,.12],[.08,.5],[.5,.5],[.92,.5],[.08,.88],[.5,.88],[.92,.88]];
export class Calibration {
  constructor(onComplete) { this.onComplete = onComplete; this.overlay = document.querySelector('#calibration'); this.dot = document.querySelector('#calibrationDot'); this.index = 0; this.samples = []; this.active = false; }
  start() { this.index = 0; this.samples = []; this.active = true; this.overlay.hidden = false; this.next(); }
  next() { if (this.index >= POINTS.length) return this.finish(); const [x,y] = POINTS[this.index]; this.dot.style.left = `${x * 100}%`; this.dot.style.top = `${y * 100}%`; this.current = []; setTimeout(() => { if (!this.active) return; const mean = this.mean(this.current); if (mean) this.samples.push({ gaze: mean, screen: {x: x * innerWidth, y: y * innerHeight} }); this.index++; this.next(); }, 1700); }
  add(gaze) { if (this.active && gaze) this.current.push({x:gaze.x,y:gaze.y}); }
  mean(values) { if (values.length < 8) return null; return {x:values.reduce((s,v)=>s+v.x,0)/values.length,y:values.reduce((s,v)=>s+v.y,0)/values.length}; }
  finish() { this.active=false; this.overlay.hidden=true; if (this.samples.length < 6) { alert('Calibration needs a steady visible face. Please try again.'); return; } const model = fitAffine(this.samples); localStorage.setItem('eyeVoiceCalibration', JSON.stringify(model)); this.onComplete(model); }
}
function solve3(m, v) { const a=m.map((r,i)=>[...r,v[i]]); for(let i=0;i<3;i++){let pivot=i;for(let r=i+1;r<3;r++)if(Math.abs(a[r][i])>Math.abs(a[pivot][i]))pivot=r;[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];if(!d)return null;for(let j=i;j<4;j++)a[i][j]/=d;for(let r=0;r<3;r++)if(r!==i){const f=a[r][i];for(let j=i;j<4;j++)a[r][j]-=f*a[i][j];}}return a.map(r=>r[3]); }
function fitAffine(samples) { let xx=0,xy=0,x1=0,yy=0,y1=0,n=samples.length,bx=[0,0,0],by=[0,0,0]; for(const s of samples){const x=s.gaze.x,y=s.gaze.y,t=[x,y,1];xx+=x*x;xy+=x*y;x1+=x;yy+=y*y;y1+=y;for(let i=0;i<3;i++){bx[i]+=t[i]*s.screen.x;by[i]+=t[i]*s.screen.y;}} const m=[[xx,xy,x1],[xy,yy,y1],[x1,y1,n]];return {x:solve3(m,bx),y:solve3(m,by)}; }
export function mapGaze(gaze, model) { if (!model) return null; return {x: Math.max(0,Math.min(innerWidth,model.x[0]*gaze.x+model.x[1]*gaze.y+model.x[2])),y:Math.max(0,Math.min(innerHeight,model.y[0]*gaze.x+model.y[1]*gaze.y+model.y[2]))}; }
