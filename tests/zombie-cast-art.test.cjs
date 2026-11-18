const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),Z=require('../zombie-form');
// Read-only decoding of the shipped RGBA atlas to validate the calibrated palm anchors.
function png(path){const b=fs.readFileSync(path),width=b.readUInt32BE(16),height=b.readUInt32BE(20);assert.equal(b[24],8);assert.equal(b[25],6);let chunks=[];for(let p=8;p<b.length;){const n=b.readUInt32BE(p);if(b.toString('ascii',p+4,p+8)==='IDAT')chunks.push(b.subarray(p+8,p+8+n));p+=n+12;}const raw=zlib.inflateSync(Buffer.concat(chunks)),stride=width*4,data=new Uint8ClampedArray(stride*height);let p=0;
 for(let y=0;y<height;y++){const filter=raw[p++];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?data[i-4]:0,c=y&&x>=4?data[i-stride-4]:0,u=y?data[i-stride]:0;let n=0;if(filter===1)n=a;if(filter===2)n=u;if(filter===3)n=Math.floor((a+u)/2);if(filter===4){const v=a+u-c,pa=Math.abs(v-a),pb=Math.abs(v-u),pc=Math.abs(v-c);n=pa<=pb&&pa<=pc?a:pb<=pc?u:c;}data[i]=(raw[p++]+n)&255;}}return{width,height,data};}
const image=png('assets/sprites/zombi-disparo-direcciones-v1.png');
test('all twelve cast frames have opaque palms at the exact ray anchors and transparent cell boundaries',()=>{
 assert.equal(image.width,1086);assert.equal(image.height,1448);
 for(const r of Z.castRows)for(const [i,[x,y]] of r.palms.entries()){
  assert.ok(image.data[(y*image.width+x)*4+3]>190,`palm ${x},${y}`);
  for(const boundary of [[0,362,774][i],[362,774,1086][i]-1])for(let yy=r.top;yy<r.bottom;yy++)assert.ok(image.data[(yy*image.width+boundary)*4+3]<190,'no limb crosses a crop boundary');
 }
});
test('cast rendering and its origin use identical anchors throughout recovery and while airborne',()=>{
 const old=global.document;global.document={createElement(){let data;return{width:0,height:0,getContext(){return{drawImage(i){data=i.data;},getImageData(){return{data};}};}};}};
 try{Z.setSheet(png('assets/sprites/zombi-soldado-v1.png'));Z.setCastSheet(image);}finally{global.document=old;}
 for(const facing of [-1,1])for(const y of [-1,-.707,0,.707])for(const zombiePose of [.28,.10,.02]){
  const p={form:'zombie',x:200,y:400,facing,castFacing:facing,castAim:{x:y===-1?0:facing*Math.sqrt(1-y*y),y},zombiePose,zombieAction:'ray',grounded:false},calls=[],c={save(){},restore(){},translate(){},scale(){},drawImage(...a){calls.push(a);}};
  Z.draw(c,p);assert.equal(calls.length,1);const a=calls[0],q=Z.castPose(p),o=Z.castOrigin(p);assert.equal(a[0],image);assert.equal(c.imageSmoothingEnabled,false);
  assert.ok(Math.abs(o.x-(200+facing*(a[5]+(q.palm[0]-a[1])*a[7]/a[3])))<1e-8);assert.ok(Math.abs(o.y-(400+a[6]+(q.palm[1]-a[2])*a[8]/a[4]))<1e-8);
 }
});
