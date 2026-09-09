export class DwellSelection {
  constructor(onSelect, getDuration) { this.onSelect=onSelect; this.getDuration=getDuration; this.target=null; this.started=0; this.lockedUntil=0; }
  update(target, now=performance.now()) { if(now<this.lockedUntil){this.clear();return} if(target!==this.target){this.clear();this.target=target;this.started=now;if(target)target.classList.add('focused')} if(!this.target)return; const pct=Math.min(1,(now-this.started)/this.getDuration(this.target)); this.target.style.setProperty('--dwell',pct); if(pct===1){const selected=this.target;this.clear();this.lockedUntil=now+550;selected.classList.add('selected');setTimeout(()=>selected.classList.remove('selected'),500);this.onSelect(selected);} }
  clear(){if(this.target){this.target.classList.remove('focused');this.target.style.removeProperty('--dwell')}this.target=null;}
}
