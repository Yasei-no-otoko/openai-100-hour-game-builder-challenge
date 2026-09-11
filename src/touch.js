/* Multi-pointer controls. Each finger owns its capture; lifting an action
 * finger never releases movement. No polling timers or external libraries. */
(function(root){'use strict';
  class TouchController {
    constructor({pad,surface,knob,isPlaying,isMobile,getWorld,unlock,sensitivity}) {
      Object.assign(this,{pad,surface,knob,isPlaying,isMobile,getWorld,unlock,sensitivity});
      this.pointer=null;this.capture=null;this.mx=0;this.my=0;this.lastX=0;this.lastY=-1;
      this.pending=new Set();this.held=new Map();
      for(const el of [pad,surface]) {
        el.addEventListener('pointerdown',e=>this.begin(e,el));
        el.addEventListener('pointermove',e=>this.move(e));
        for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,e=>this.end(e));
        el.addEventListener('contextmenu',e=>{if(this.isMobile())e.preventDefault();});
      }
      this.bind(document.getElementById('touch-dash'),'dash');
      this.bind(document.getElementById('touch-parry'),'parry');
      this.bind(document.getElementById('touch-nova'),'nova');
    }
    begin(e,el){
      if(!this.isMobile()||!this.isPlaying()||this.pointer!==null||e.button>0)return;
      this.unlock();e.preventDefault();this.pointer=e.pointerId;this.capture=el;
      this.ox=e.clientX;this.oy=e.clientY;this.mx=this.my=0;
      try{el.setPointerCapture(e.pointerId);}catch(_){}
      this.pad.classList.add('active');this.paint(0,0);
    }
    move(e){
      if(e.pointerId!==this.pointer)return;
      if(!this.isPlaying()){this.clear();return;}
      e.preventDefault();
      const dx=(e.clientX-this.ox)*this.sensitivity(),dy=(e.clientY-this.oy)*this.sensitivity();
      const d=Math.hypot(dx,dy),radius=Math.max(28,Math.min(42,this.pad.clientWidth*.31));
      const magnitude=Math.min(1,Math.max(0,(d-4)/(radius-4)));
      this.mx=d?dx/d*magnitude:0;this.my=d?dy/d*magnitude:0;
      if(magnitude>.1){this.lastX=dx/d;this.lastY=dy/d;}
      this.paint(this.mx*radius,this.my*radius);
    }
    paint(x,y){this.knob.style.transform=`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;}
    end(e){
      if(e.pointerId!==this.pointer)return;
      const el=this.capture,id=this.pointer;this.pointer=null;this.capture=null;this.mx=this.my=0;
      this.pad.classList.remove('active');this.paint(0,0);
      try{if(el?.hasPointerCapture(id))el.releasePointerCapture(id);}catch(_){}
    }
    allowed(action){const w=this.getWorld();if(!w||!this.isPlaying())return false;
      return action==='nova'?w.p.energy>=w.novaCost():action==='dash'?w.p.dashCd<=0:w.p.parryCd<=0;}
    queue(action){if(this.allowed(action)){this.unlock();this.pending.add(action);return true;}return false;}
    bind(button,action){
      button.addEventListener('pointerdown',e=>{
        if(!this.isPlaying()||e.button>0)return;e.preventDefault();
        this.queue(action);this.held.set(e.pointerId,button);button.classList.add('is-held');
        try{button.setPointerCapture(e.pointerId);}catch(_){}
      });
      const end=e=>{if(this.held.get(e.pointerId)!==button)return;this.held.delete(e.pointerId);
        if(!Array.from(this.held.values()).includes(button))button.classList.remove('is-held');};
      for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,end);
      // Keyboard and assistive-technology activation has no pointerdown.
      button.addEventListener('click',e=>{if(e.detail===0)this.queue(action);});
      button.addEventListener('contextmenu',e=>e.preventDefault());
    }
    sample(){
      let mx=this.mx,my=this.my;const dash=this.pending.has('dash');
      // A stationary tap dashes in the last movement direction, not at the boss.
      if(dash&&Math.hypot(mx,my)<.05){mx=this.lastX;my=this.lastY;}
      return {mx,my,shoot:true,autoAim:true,dash,parry:this.pending.has('parry'),nova:this.pending.has('nova')};
    }
    consume(){this.pending.clear();}
    clear(){
      if(this.pointer!==null)this.end({pointerId:this.pointer});
      for(const [id,el] of this.held){el.classList.remove('is-held');try{if(el.hasPointerCapture(id))el.releasePointerCapture(id);}catch(_){}}
      this.held.clear();this.pending.clear();this.mx=this.my=0;
    }
    snapshot(){return {mx:this.mx,my:this.my,movingPointer:this.pointer,heldActions:this.held.size,pending:[...this.pending]};}
  }
  root.PactTouch={TouchController};
})(window);
