window.WHITE_DEATH_FRAMES=[[57, 141, 410, 410], [582, 187, 319, 364], [1094, 256, 346, 295], [47, 663, 436, 242], [541, 751, 419, 154], [1044, 768, 452, 137]];
window.WHITE_DEATH_SCALE=0.2;
window.prepareWhiteDeath=function(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>=200?255:0;ctx.putImageData(data,0,0);return c;};
