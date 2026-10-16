(() => {
  "use strict";
  function createMeadow(canvas, bouquetMode = false) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
  if (!gl) { canvas.remove(); return; }

  const vertex = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 position;
    layout(location=1) in vec3 normal;
    layout(location=2) in mat4 model;
    layout(location=6) in vec3 color;
    layout(location=7) in vec4 wind;
    uniform mat4 projection, view;
    uniform float time;
    out vec3 worldPosition, worldNormal, surfaceColor;
    void main() {
      vec4 p = model * vec4(position, 1.0);
      float height = max(0.0, p.y - wind.x);
      float wave = sin(time * .65 + wind.y) * wind.z;
      p.x += wave * height * height;
      p.z += cos(time * .52 + wind.y) * wind.z * height * .5;
      vec3 scaleSquared = vec3(dot(model[0].xyz, model[0].xyz), dot(model[1].xyz, model[1].xyz), dot(model[2].xyz, model[2].xyz));
      worldNormal = normalize(mat3(model) * (normal / max(scaleSquared, vec3(.000001))));
      worldPosition = p.xyz;
      surfaceColor = color;
      gl_Position = projection * view * p;
    }`;
  const fragment = `#version 300 es
    precision highp float;
    in vec3 worldPosition, worldNormal, surfaceColor;
    uniform vec3 eye;
    out vec4 fragColor;
    void main() {
      vec3 n = normalize(worldNormal);
      vec3 light = normalize(vec3(-.7, 1.4, .8));
      vec3 direction = normalize(eye - worldPosition);
      float diffuse = max(dot(n, light), 0.0);
      float sky = .5 + .5 * n.y;
      float shine = pow(max(dot(n, normalize(light + direction)), 0.0), 38.0);
      vec3 lit = surfaceColor * (.43 + .18 * sky + .42 * diffuse);
      lit += vec3(1.0, .88, .78) * shine * .23;
      lit += vec3(.12, .045, .06) * pow(1.0 - max(dot(n, direction), 0.0), 3.0) * .16;
      float distance = length(eye - worldPosition);
      float fog = smoothstep(12.0, 48.0, distance);
      vec3 fogColor = vec3(.98, .80, .84);
      fragColor = vec4(mix(lit, fogColor, fog), 1.0);
    }`;
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) { console.error("Meadow renderer:", error); canvas.remove(); return; }
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  const uniform = Object.fromEntries(["projection", "view", "time", "eye"].map(name => [name, gl.getUniformLocation(program, name)]));
  const normalize = v => { const d = Math.hypot(...v) || 1; return v.map(x => x / d); };
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const dot = (a, b) => a.reduce((s, x, i) => s + x*b[i], 0);
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const mul = (v, s) => v.map(x => x*s);
  let seed = 71432;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const spheres = [], stems = [], flowers = [];
  const up = [0, 1, 0], right = [1, 0, 0], forward = [0, 0, 1];
  function instance(target, center, axes, size, color, wind = [0, 0, 0, 0]) {
    for (let i=0; i<3; i++) target.push(...mul(axes[i], size[i]), 0);
    target.push(...center, 1, ...color, ...wind);
  }
  function sphere(center, size, color, axes = [right, up, forward], wind) {
    instance(spheres, center, axes, size, color, wind);
  }
  function stem(a, b, radius, color, wind) {
    const delta = b.map((x,i) => x-a[i]);
    const y = normalize(delta), x = normalize(cross(y, [0,0,1])), z = cross(x,y);
    instance(stems, mul(add(a,b), .5), [x,y,z], [radius, Math.hypot(...delta)/2, radius], color, wind);
  }
  function terrainHeight(x,z) { return -.7 + .32*Math.sin(x*.17+z*.09) + .25*Math.cos(z*.22); }
  function flower(x, z, scale, kind, bouquetFacing=0) {
    const ground = terrainHeight(x,z);
    const height = (1.0 + random()*.65) * scale * (kind===6?1.35:kind===5?.9:1);
    const lean = (random()-.5)*.22;
    const center = [x+lean, ground+height, z];
    const phase = random()*Math.PI*2;
    const wind = [ground, phase, .035, 0];
    const green = [.24+random()*.08, .45+random()*.12, .25];
    const middle = [x+lean*.35, ground+height*.5, z+.035];
    stem([x,ground,z], middle, .026*scale, green, wind);
    stem(middle, center, .021*scale, green, wind);
    for (let j=0; j<2; j++) {
      const side = j ? -1 : 1;
      const leafCenter = [x+side*.18*scale, ground+height*(.32+j*.18), z+.03];
      const long = normalize([side*.8,.55,.1]);
      const width = normalize(cross(long, forward));
      sphere(leafCenter, [.26*scale,.075*scale,.025*scale], [.33,.58,.29], [long,width,forward], wind);
    }
    const facing = bouquetMode ? bouquetFacing+(random()-.5)*.35 : random()*Math.PI*2;
    const n = normalize([Math.sin(facing)*.62,.75,Math.cos(facing)*.62]);
    const u = normalize(cross(up,n)), v = cross(n,u);
    const petals = kind === 2 ? 12 : kind === 1 ? 5 : 7;
    const radius = scale*(kind === 2 ? .26 : kind === 1 ? .34 : .3);
    const pinks = [[.98,.31,.61],[1,.51,.72],[.92,.21,.5],[1,.73,.83]];
    const color = kind === 2 ? [1,.97,.88] : kind === 1 ? [1,.28,.3] : pinks[Math.floor(random()*pinks.length)];
    const rotation = random()*6.28;
    const bloom = { center, wind, kind, petals: [], core: 0, active: false };
    const petal = (position, size, tint, axes) => { bloom.petals.push(spheres.length); sphere(position,size,tint,axes,wind); };
    if (kind === 3) {
      // Six upright, overlapping petals make a closed tulip cup.
      for(let j=0;j<6;j++) {
        const a=j*Math.PI/3, radial=[Math.cos(a),0,Math.sin(a)], tangent=[-Math.sin(a),0,Math.cos(a)];
        const long=normalize(add(up,mul(radial,.24)));
        petal(add(center,add(mul(radial,.14*scale),[0,.12*scale,0])),[.16*scale,.32*scale,.075*scale],j%2?[1,.43,.62]:[.95,.23,.48],[tangent,long,normalize(cross(tangent,long))]);
      }
      bloom.core=spheres.length;
      sphere(center,[.08*scale,.1*scale,.08*scale],[.93,.61,.16],[right,up,forward],wind);
      flowers.push(bloom);return;
    }
    if (kind === 4) {
      // A tall lavender spike with tiered florets, instead of a radial bloom.
      stem(center,add(center,[0,.55*scale,0]),.015*scale,green,wind);
      for(let row=0;row<6;row++)for(let j=0;j<3;j++) {
        const a=j*Math.PI*2/3+row*.8, radial=[Math.cos(a),0,Math.sin(a)], size=(1-row*.09)*scale;
        petal(add(center,add(mul(radial,.085*size),[0,row*.095*scale,0])),[.075*size,.11*size,.065*size],row%2?[.66,.44,.82]:[.49,.3,.72],[right,up,forward]);
      }
      bloom.core=bloom.petals[bloom.petals.length-1];flowers.push(bloom);return;
    }
    if (kind === 5) {
      // A rose: three nested, cupped spirals of broad overlapping petals.
      for(let ring=0;ring<3;ring++)for(let j=0;j<8-ring;j++) {
        const angle=j/(8-ring)*Math.PI*2+ring*.6+rotation;
        const radial=add(mul(u,Math.cos(angle)),mul(v,Math.sin(angle)));
        const tangent=normalize(cross(n,radial));
        const long=normalize(add(mul(radial,.6),mul(n,.8)));
        const r=(.23-ring*.075)*scale;
        petal(add(center,add(mul(radial,r),mul(n,ring*.065*scale))),
          [(.18-ring*.035)*scale,(.2-ring*.035)*scale,.055*scale],
          ring===2?[.96,.46,.61]:ring===1?[.91,.25,.48]:[1,.55,.68],
          [tangent,long,normalize(cross(tangent,long))]);
      }
      bloom.core=spheres.length;
      sphere(add(center,mul(n,.15*scale)),[.065*scale,.065*scale,.09*scale],[.76,.16,.37],[u,v,n],wind);
      flowers.push(bloom);return;
    }
    if (kind === 6) {
      // Sunflowers have two gold rays and a broad, seeded chocolate center.
      for(let j=0;j<20;j++) {
        const a=j*Math.PI/10+rotation, radial=add(mul(u,Math.cos(a)),mul(v,Math.sin(a)));
        const tangent=normalize(cross(n,radial)), long=normalize(add(radial,mul(n,j%2?.12:-.12)));
        petal(add(center,mul(radial,.32*scale)),[.24*scale,.07*scale,.035*scale],j%2?[1,.72,.12]:[1,.86,.3],[long,tangent,normalize(cross(long,tangent))]);
      }
      bloom.core=spheres.length;
      sphere(add(center,mul(n,.035*scale)),[.21*scale,.21*scale,.11*scale],[.32,.16,.09],[u,v,n],wind);
      for(let j=0;j<18;j++) {
        const a=j*2.4,r=.17*scale*Math.sqrt(j/18);
        sphere(add(center,add(add(mul(u,Math.cos(a)*r),mul(v,Math.sin(a)*r)),mul(n,.13*scale))),[.022*scale,.022*scale,.015*scale],[.67,.39,.13],[u,v,n],wind);
      }
      flowers.push(bloom);return;
    }
    if (kind === 7) {
      // Bluebells: three hanging, flared cups on curved side branches.
      for(let bell=0;bell<3;bell++) {
        const a=rotation+bell*2.4, radial=[Math.cos(a),0,Math.sin(a)];
        const shoulder=add(center,[0,(.32-bell*.12)*scale,0]);
        const tip=add(shoulder,add(mul(radial,.2*scale),[0,-.14*scale,0]));
        stem(center,shoulder,.012*scale,green,wind);
        stem(shoulder,add(tip,[0,.08*scale,0]),.012*scale,green,wind);
        for(let j=0;j<6;j++) {
          const t=j*Math.PI/3, out=[Math.cos(t),0,Math.sin(t)], tangent=[-Math.sin(t),0,Math.cos(t)];
          const long=normalize(add(mul(up,-1),mul(out,.4)));
          petal(add(tip,add(mul(out,.085*scale),[0,-.08*scale,0])),[.075*scale,.16*scale,.03*scale],bell%2?[.61,.65,.98]:[.43,.46,.86],[tangent,long,normalize(cross(tangent,long))]);
        }
        bloom.core=spheres.length;
        sphere(add(tip,[0,-.16*scale,0]),[.035*scale,.055*scale,.035*scale],[1,.85,.55],[right,up,forward],wind);
      }
      flowers.push(bloom);return;
    }
    for (let j=0; j<petals; j++) {
      const angle = j/petals*Math.PI*2+rotation;
      const radial = add(mul(u,Math.cos(angle)),mul(v,Math.sin(angle)));
      const tangent = add(mul(u,-Math.sin(angle)),mul(v,Math.cos(angle)));
      const petalCenter = add(center, add(mul(radial,radius*.72),mul(n,-.016*scale)));
      const long = normalize(add(radial,mul(n,.19)));
      const thickness = normalize(cross(long,tangent));
      bloom.petals.push(spheres.length);
      sphere(petalCenter,[radius*.82,radius*(kind===2?.24:kind===1?.72:.46),radius*.17],color,[long,tangent,thickness],wind);
    }
    bloom.core = spheres.length;
    sphere(add(center,mul(n,.055*scale)),[radius*.4,radius*.4,radius*.25],kind===1?[.2,.12,.22]:[1,.67,.16],[u,v,n],wind);
    for (let j=0; j<7; j++) {
      const a = j*2.4, r = radius*.25*Math.sqrt(j/7);
      sphere(add(center, add(add(mul(u,Math.cos(a)*r),mul(v,Math.sin(a)*r)),mul(n,.12*scale))),[.018*scale,.018*scale,.018*scale],kind===1?[.32,.19,.29]:[.74,.37,.07],[u,v,n],wind);
    }
    flowers.push(bloom);
  }
  const narrow = matchMedia("(max-width: 650px)").matches;
  const mobile = matchMedia("(pointer: coarse)").matches || narrow;
  // Full rings surround the viewing point, so every heading has a dense meadow.
  if(!bouquetMode) {
    const rings=mobile?14:18;
    for(let ring=0;ring<rings;ring++) {
      const count=10+ring*(mobile?3:5), offset=random()*Math.PI*2;
      for(let j=0;j<count;j++) {
        const angle=j/count*Math.PI*2+offset+(random()-.5)*.06;
        const radius=3.3+ring*(mobile?2.45:1.9)+(random()-.5)*.7;
        flower(Math.sin(angle)*radius,9-Math.cos(angle)*radius,.66+random()*.55,(j+ring)%8);
      }
    }
  }
  // Deliberate large blooms frame the foreground on wide and narrow screens.
  const foreground = narrow
    ? [[-.72,4.5,.85],[.76,4.2,.9],[-1.25,1.2,1.05],[1.28,1,1],[-.48,6,.65],[.5,6.4,.65]]
    : mobile
    ? [[-.85,4.5,1],[.95,4.2,1.15],[-1.6,1.2,1.35],[1.65,1,1.2],[-.55,6,.7],[.6,6.4,.7]]
    : [[-3.5,4,1.5],[3.6,4.2,1.7],[-5,1.2,1.8],[5.2,1,1.5],[-2.2,6,1.1],[2.6,6.4,1.3]];
  if(!bouquetMode)foreground.forEach(([x,z,s],i)=>flower(x,z,s,[3,0,4,1,2,3][i]));
  for (let i=0;i<(bouquetMode?0:mobile?180:450);i++) {
    const angle=random()*Math.PI*2,radius=3+Math.sqrt(random())*40;
    const x=Math.sin(angle)*radius,z=9-Math.cos(angle)*radius,y=terrainHeight(x,z),h=.1+random()*.26;
    const axis=normalize([(random()-.5)*.6,1,(random()-.5)*.6]);
    const a=normalize(cross(axis,forward));
    sphere([x,y+h*.5,z],[.025,h,.018],[.38+random()*.1,.57+random()*.09,.29],[a,axis,cross(a,axis)],[y,random()*6.28,.045,0]);
  }

  function sphereGeometry() {
    const positions=[],normals=[],indices=[],segments=12,rings=8;
    for(let y=0;y<=rings;y++) for(let x=0;x<=segments;x++) {
      const a=x/segments*Math.PI*2,b=y/rings*Math.PI;
      const p=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];
      positions.push(...p); normals.push(...p);
    }
    for(let y=0;y<rings;y++) for(let x=0;x<segments;x++) {
      const a=y*(segments+1)+x,b=a+segments+1;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
    return {positions,normals,indices};
  }
  function cylinderGeometry() {
    const positions=[],normals=[],indices=[],segments=8;
    for(let y=0;y<2;y++) for(let i=0;i<=segments;i++) {
      const a=i/segments*Math.PI*2;
      positions.push(Math.cos(a),y*2-1,Math.sin(a)); normals.push(Math.cos(a),0,Math.sin(a));
    }
    for(let i=0;i<segments;i++) indices.push(i,i+segments+1,i+1,i+segments+1,i+segments+2,i+1);
    return {positions,normals,indices};
  }
  function terrainGeometry() {
    const positions=[],normals=[],indices=[],cols=55,rows=65;
    for(let row=0;row<=rows;row++) for(let col=0;col<=cols;col++) {
      const x=-65+col*130/cols,z=74-row*130/rows;
      positions.push(x,terrainHeight(x,z),z);
      normals.push(...normalize([-(terrainHeight(x+.01,z)-terrainHeight(x-.01,z))/.02,1,-(terrainHeight(x,z+.01)-terrainHeight(x,z-.01))/.02]));
    }
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
      const a=r*(cols+1)+c,b=a+cols+1; indices.push(a,a+1,b,b,a+1,b+1);
    }
    return {positions,normals,indices};
  }
  function batch(geometry, instances, dynamic = false) {
    const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
    function attribute(location,data,size) {
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);
    }
    attribute(0,geometry.positions,3);attribute(1,geometry.normals,3);
    const data = new Float32Array(instances);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
    const stride=23*4;
    for(let i=0;i<4;i++) {gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,stride,i*16);gl.vertexAttribDivisor(2+i,1);}
    gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,3,gl.FLOAT,false,stride,64);gl.vertexAttribDivisor(6,1);
    gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,4,gl.FLOAT,false,stride,76);gl.vertexAttribDivisor(7,1);
    const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(geometry.indices),gl.STATIC_DRAW);
    return {vao,buffer,data,count:geometry.indices.length,instances:instances.length/23};
  }
  const ground=[];instance(ground,[0,0,0],[right,up,forward],[1,1,1],[.49,.65,.37]);
  const batches=[batch(terrainGeometry(),ground),batch(cylinderGeometry(),stems),batch(sphereGeometry(),spheres,true)];
  // Curved, lit paper and satin are real meshes in the flower scene.
  const wrappingBatches=[];
  if(bouquetMode) {
    function surface(sample, color, columns=64, rows=22) {
      const positions=[],normals=[],indices=[];
      for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++) {
        const u=i/columns,v=j/rows,p=sample(u,v),e=.0001;
        const du=sample(u+e,v).map((x,k)=>x-p[k]);
        const dv=sample(u,v+e).map((x,k)=>x-p[k]);
        positions.push(...p);normals.push(...normalize(cross(du,dv)));
      }
      for(let j=0;j<rows;j++)for(let i=0;i<columns;i++) {
        const a=j*(columns+1)+i,b=a+columns+1;
        indices.push(a,a+1,b,b,a+1,b+1);
      }
      // Back faces have their own normals, so folded paper is lit on both sides.
      const count=positions.length/3;
      positions.push(...positions.slice());normals.push(...normals.map(x=>-x));
      const front=indices.slice();
      for(let i=0;i<front.length;i+=3)indices.push(front[i]+count,front[i+2]+count,front[i+1]+count);
      const data=[];instance(data,[0,0,0],[right,up,forward],[1,1,1],color);
      wrappingBatches.push(batch({positions,normals,indices},data));
    }
    // Scalloped ivory tissue rises behind the flowers, with visible pleated folds.
    surface((u,v)=>{
      const a=.5+u*(Math.PI*2-1),r=.17+v*(1.08+.065*Math.cos(a*7));
      return [Math.sin(a)*r,-1.28+v*(2.1+.16*Math.cos(a*5)),Math.cos(a)*r*.53-.1];
    },[1,.93,.8]);
    // Two overlapping sheets form an open cone; the front lip dips below the heads.
    for(let layer=0;layer<2;layer++) surface((u,v)=>{
      const a=-Math.PI+u*Math.PI*2+layer*.4;
      const front=Math.max(0,Math.cos(a));
      const fold=.035*Math.sin(a*9+layer)*v*v;
      const r=.17+(1.02+fold)*v;
      const top=.78-.35*front+.07*Math.sin(a*3+layer);
      return [Math.sin(a)*r*(1+layer*.035),-1.3+(top+1.3)*v,Math.cos(a)*r*.6+layer*.045];
    },layer?[.96,.66,.79]:[.83,.43,.63]);
    // A turned cream edge catches the light along the outer sheet.
    surface((u,v)=>{
      const a=-Math.PI+u*Math.PI*2+.4,r=1.19+.035*Math.sin(a*9+1);
      return [Math.sin(a)*r*1.035,.78-.35*Math.max(0,Math.cos(a))+.07*Math.sin(a*3+1)-v*.026,Math.cos(a)*r*.6+.047];
    },[1,.91,.92],96,2);
    // Voluminous satin loops and loose curled tails, sitting in front of the paper.
    for(const side of [-1,1]) {
      surface((u,v)=>{
        const a=u*Math.PI*2, width=(v-.5)*.17;
        return [side*(.06+.55*Math.sin(a/2)), -.51+.19*Math.sin(a)+width, .57+.2*Math.sin(a/2)+.11*Math.cos(a)];
      },[.88,.27,.53],64,8);
      surface((u,v)=>{
        const width=(v-.5)*(.14+.06*u);
        return [side*(.05+.35*u+.09*Math.sin(u*5))+width,-.55-u*.64,.67+.09*Math.sin(u*6)-.16*u];
      },[.95,.42,.64],40,8);
    }
    const knot=[];
    const ivory=[1,.96,.86],gold=[.87,.65,.34];
    function bead(point,size,color=ivory,axes=[right,up,forward]) {
      instance(knot,point,axes,Array.isArray(size)?size:[size,size,size],color);
    }
    function outerPaper(a,v) {
      const r=.17+(1.02+.035*Math.sin(a*9+1)*v*v)*v;
      return [Math.sin(a)*r*1.035,-1.3+(.78-.35*Math.max(0,Math.cos(a))+.07*Math.sin(a*3+1)+1.3)*v,Math.cos(a)*r*.6+.045];
    }
    function cord(path,color,radius=.009) {
      surface((u,v)=>{
        const p=path(u),q=path(u+.0001),axis=normalize(q.map((n,i)=>n-p[i]));
        const x=normalize(cross(axis,Math.abs(axis[1])>.95?right:up)),y=cross(axis,x);
        return add(p,add(mul(x,Math.cos(v*Math.PI*2)*radius),mul(y,Math.sin(v*Math.PI*2)*radius)));
      },color,96,8);
    }
    // The pearl edging follows the folded paper all the way around the bouquet.
    cord(u=>outerPaper(u*Math.PI*2,1.005),gold,.008);
    for(let i=0;i<96;i++) {
      const a=i/96*Math.PI*2,p=outerPaper(a,.992);
      bead(add(p,[Math.sin(a)*.014,.014,Math.cos(a)*.014]),i%4===0?.019:.012);
    }
    // Raised pin-dot embroidery catches light on the back as well as the front.
    for(let row=0;row<4;row++)for(let i=0;i<24;i++) {
      const a=(i+(row%2)*.5)/24*Math.PI*2,p=outerPaper(a,.52+row*.105);
      const n=normalize([Math.sin(a),-.38,Math.cos(a)*1.5]);
      bead(add(p,mul(n,.011)),.009,row%2?ivory:[1,.83,.82]);
    }
    // Fine gold piping traces both loops of the satin bow.
    for(const side of [-1,1]) cord(u=>{
      const a=u*Math.PI*2;
      return [side*(.06+.55*Math.sin(a/2)),-.51+.19*Math.sin(a)+.085,.575+.2*Math.sin(a/2)+.11*Math.cos(a)];
    },[1,.79,.64],.006);
    // A little ivory locket hangs on an actual curved cord beside the bow.
    cord(u=>[.04+.48*u,-.44+.35*Math.sin(u*Math.PI),.83-.08*u],gold,.009);
    bead([.52,-.44,.75],[.18,.235,.035],gold);
    bead([.52,-.44,.779],[.163,.218,.025],ivory);
    for(let i=0;i<24;i++) {
      const a=i/24*Math.PI*2;
      bead([.52+Math.cos(a)*.148,-.44+Math.sin(a)*.199,.796],.009,gold);
    }
    surface((u,v)=>{
      const a=u*Math.PI*2,r=1-v;
      return [.52+.09*Math.pow(Math.sin(a),3)*r,-.43+.006*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*r,.808+.025*Math.sin(v*Math.PI/2)];
    },[.86,.3,.51],64,12);
    // Folded base stays finished when the bouquet is tilted to show its underside.
    surface((u,v)=>{
      const a=u*Math.PI*2,r=.175*v;
      return [Math.sin(a)*r,-1.3-.035*(1-v),Math.cos(a)*r*.6+.025];
    },[.85,.49,.65],48,8);
    instance(knot,[0,-.5,.76],[right,up,forward],[.13,.115,.09],[.98,.76,.84]);
    instance(knot,[0,-.49,.84],[right,up,forward],[.065,.065,.04],[1,.93,.77]);
    wrappingBatches.push(batch(sphereGeometry(),knot));
    canvas.dataset.wrapping='3d';
  }
  const petalBatch = batches[2];
  const fallenPetalsKey='garden:fallenPetals:v1';
  const localFileScope=window.location?.protocol==='file:'?window.location.pathname.replace(/[^/]*$/,''):null;
  const petalWindowPrefix='garden-fallen-petals:';
  let groundPetals=[],groundDirty=false,groundSaveTimer=0;
  function loadGroundPetals() {
    if(bouquetMode)return;
    try {
      const saved=JSON.parse(localStorage.getItem(fallenPetalsKey)||'[]');
      if(Array.isArray(saved)&&saved.length%23===0&&saved.every(Number.isFinite))groundPetals=saved;
    } catch { /* The meadow still works when browser storage is unavailable. */ }
    // Directly opened HTML files can have separate storage per page. Carry the
    // ground through same-tab navigation as well, scoped to this site's folder.
    if(localFileScope&&window.name.startsWith(petalWindowPrefix))try {
      const saved=JSON.parse(window.name.slice(petalWindowPrefix.length));
      if(saved.scope===localFileScope&&Array.isArray(saved.petals)&&saved.petals.length%23===0&&saved.petals.every(Number.isFinite))groundPetals=saved.petals;
    } catch { /* Ignore unrelated or invalid window state. */ }
    groundDirty=true;
  }
  function saveGroundPetals() {
    clearTimeout(groundSaveTimer);groundSaveTimer=0;
    if(bouquetMode)return;
    try { localStorage.setItem(fallenPetalsKey,JSON.stringify(groundPetals)); }
    catch { /* Keep the petals visible for this visit even if storage is full. */ }
    if(localFileScope)window.name=petalWindowPrefix+JSON.stringify({scope:localFileScope,petals:groundPetals});
  }
  loadGroundPetals();
  const groundPetalBatch=bouquetMode?null:batch(sphereGeometry(),groundPetals,true);
  let renderedEye=[0,2.5,9], renderedTarget=[0,.55,-9], renderedTime=0, lastFrameTime=0;
  // Separate instances keep the flying visitors out of flower picking and bouquets.
  const butterflyCount = bouquetMode ? 0 : (mobile ? 4 : 7);
  const butterflyParts = [];
  const butterflyCenters = [];
  const butterflyTargets = Array.from({length:butterflyCount}, (_,i) => {
    const button=document.createElement('button');
    button.type='button';button.className='butterfly-target';
    button.setAttribute('aria-label', `${i+1}-көбелек әкелген хатты ашу`);
    
    button.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('meadow:butterfly',{detail:{trigger:button}})));
    document.body.append(button);
    return button;
  });
  const butterflyColors = [[.96,.48,.71],[.72,.57,.87],[1,.79,.48],[.96,.70,.83]];
  function butterflyPose(time) {
    butterflyParts.length = 0;
    const ahead=normalize(renderedTarget.map((value,i)=>value-renderedEye[i]));
    const across=normalize(cross(ahead,up)), skyUp=cross(across,ahead);
    for (let i=0; i<butterflyCount; i++) {
      const phase=i*2.399, distance=13+(i%3)*2.1;
      const halfHeight=distance*Math.tan(26*Math.PI/180);
      const halfWidth=halfHeight*canvas.width/canvas.height;
      const side=i%2 ? 1 : -1;
      const screenX=mobile ? -.75+i*.5+.07*Math.sin(time*.16+phase) : side*.57+.23*Math.sin(time*.16+phase);
      const screenY=mobile ? .95+.012*Math.sin(time*.44+phase) : .52+(i%3)*.12+.07*Math.sin(time*.44+phase);
      const center=add(renderedEye,add(mul(ahead,distance),add(mul(across,halfWidth*screenX),mul(skyUp,halfHeight*screenY))));
      butterflyCenters[i]=center;
      const size=(mobile?.62:.74)+(i%3)*.15;
      const bank=.18*Math.sin(time*.5+phase);
      const vertical=add(mul(skyUp,Math.cos(bank)),mul(across,Math.sin(bank)));
      const horizontal=add(mul(across,Math.cos(bank)),mul(skyUp,-Math.sin(bank)));
      const toward=mul(ahead,-1);
      const tint=butterflyColors[i%butterflyColors.length];
      const piece=(position,scale,color,axes=[horizontal,vertical,toward])=>
        instance(butterflyParts,position,axes,mul(scale,size),color);
      const at=(x,y,z=0)=>add(center,add(mul(horizontal,x*size),add(mul(vertical,y*size),mul(toward,z*size))));
      const flap=.35+.85*(.5+.5*Math.sin(time*(8.5+i*.35)+phase));
      for (const sign of [-1,1]) {
        const outward=add(mul(horizontal,sign*Math.cos(flap)),mul(toward,Math.sin(flap)));
        const normal=normalize(cross(outward,vertical));
        for (const upper of [true,false]) {
          const wingCenter=add(center,add(mul(outward,(upper?.26:.21)*size),mul(vertical,(upper?.12:-.16)*size)));
          const long=normalize(add(mul(outward,upper?.65:.85),mul(vertical,upper?.76:-.53)));
          const across=normalize(cross(normal,long));
          piece(wingCenter,upper?[.34,.22,.045]:[.25,.18,.04],tint,[long,across,normal]);
          // Raised cream eyespots and a smaller pink center catch the same light as the flowers.
          const spot=add(wingCenter,mul(normal,sign*.045*size));
          piece(spot,[.085,.065,.018],[1,.88,.76],[long,across,normal]);
          piece(add(spot,mul(normal,sign*.015*size)),[.035,.03,.012],[.56,.29,.43],[long,across,normal]);
        }
        const antennaAxis=normalize(add(mul(horizontal,sign*.35),mul(vertical,.94)));
        piece(at(sign*.045,.29),[.012,.11,.012],[.46,.30,.37],[horizontal,antennaAxis,toward]);
        piece(at(sign*.08,.38),[.025,.025,.025],[.95,.76,.67]);
      }
      piece(center,[.045,.24,.05],[.48,.29,.39]);
      piece(at(0,.23),[.065,.065,.06],[.62,.38,.48]);
    }
  }
  butterflyPose(0);
  const butterflyBatch=butterflyCount ? batch(sphereGeometry(),butterflyParts,true) : null;
  canvas.dataset.butterflies=String(butterflyCount);
  canvas.dataset.instances=String(batches.reduce((sum,b)=>sum+b.instances,0));
  const motion=matchMedia("(prefers-reduced-motion: reduce)");
  let targetX=0,targetY=0,cameraX=0,cameraY=0,frame=0,contextLost=false;
  let giftYaw=0, giftPitch=.035, targetGiftYaw=0, targetGiftPitch=.035;
  let orbitDrag=null;
  function orbitBy(yaw,pitch,reset=false) {
    targetGiftYaw=reset?0:targetGiftYaw+yaw;
    targetGiftPitch=reset?.035:Math.max(-1.48,Math.min(1.48,targetGiftPitch+pitch));
    if(motion.matches){giftYaw=targetGiftYaw;giftPitch=targetGiftPitch;}
    if(!frame&&!contextLost)draw(performance.now());
  }
  if(bouquetMode) {
    canvas.addEventListener('pointerdown',event=>{
      if(!document.body.classList.contains('bouquet-finished')||!event.isPrimary||event.button!==0)return;
      orbitDrag={id:event.pointerId,x:event.clientX,y:event.clientY};
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-orbiting');
      canvas.focus({preventScroll:true});
      event.preventDefault();
    });
    canvas.addEventListener('pointermove',event=>{
      if(orbitDrag?.id!==event.pointerId)return;
      orbitBy(-(event.clientX-orbitDrag.x)/canvas.clientWidth*Math.PI*2,(event.clientY-orbitDrag.y)/canvas.clientHeight*Math.PI);
      orbitDrag.x=event.clientX;orbitDrag.y=event.clientY;
    });
    function releaseOrbit(event) {
      if(orbitDrag?.id!==event.pointerId)return;
      orbitDrag=null;canvas.classList.remove('is-orbiting');
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    }
    ['pointerup','pointercancel','lostpointercapture'].forEach(name=>canvas.addEventListener(name,releaseOrbit));
    const directions={left:[-.35,0],right:[.35,0],up:[0,.22],down:[0,-.22]};
    canvas.addEventListener('keydown',event=>{
      const keys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Home:'reset'};
      if(!keys[event.key])return;
      event.preventDefault();orbitBy(...(directions[keys[event.key]]||[0,0]),event.key==='Home');
    });
  }
  const fallingBlooms = new Set();
  let dirtyStart=Infinity, dirtyEnd=0;

  function markDirty(offset) { dirtyStart=Math.min(dirtyStart,offset); dirtyEnd=Math.max(dirtyEnd,offset+23); }
  function windPosition(record) {
    const height=Math.max(0,record[13]-record[19]);
    return [record[12]+Math.sin(renderedTime*.65+record[20])*record[21]*height*height,
      record[13], record[14]+Math.cos(renderedTime*.52+record[20])*record[21]*height*.5];
  }
  // Intersect the same ellipsoids rendered by the GPU, including their wind offset.
  function hitPetal(offset, origin, direction, padding) {
    const m=petalBatch.data.subarray(offset,offset+23), center=windPosition(m);
    const relative=origin.map((x,i)=>x-center[i]), localOrigin=[],localDirection=[];
    for(let i=0;i<3;i++) {
      const axis=m.subarray(i*4,i*4+3), lengthSquared=dot(axis,axis);
      localOrigin.push(dot(relative,axis)/lengthSquared/padding);
      localDirection.push(dot(direction,axis)/lengthSquared/padding);
    }
    const a=dot(localDirection,localDirection),b=dot(localOrigin,localDirection),c=dot(localOrigin,localOrigin)-1;
    const discriminant=b*b-a*c;
    if(discriminant<0)return Infinity;
    const distance=(-b-Math.sqrt(discriminant))/a;
    return distance>0?distance:Infinity;
  }
  function pickFlower(clientX,clientY,touch) {
    const forward=normalize(renderedTarget.map((x,i)=>x-renderedEye[i]));
    const horizontal=normalize(cross(forward,up)), vertical=cross(horizontal,forward);
    const spread=Math.tan(52*Math.PI/360);
    const direction=normalize(add(forward,add(mul(horizontal,(clientX/innerWidth*2-1)*spread*innerWidth/innerHeight),mul(vertical,(1-clientY/innerHeight*2)*spread))));
    let nearest=Infinity,selected=null;
    for(const bloom of flowers) {
      if(bloom.active)continue;
      for(const offset of [...bloom.petals,bloom.core]) {
        const distance=hitPetal(offset,renderedEye,direction,touch?1.18:1.05);
        if(distance<nearest) { nearest=distance;selected=bloom; }
      }
    }
    return selected;
  }
  function rotateVector(v,axis,angle) {
    return add(add(mul(v,Math.cos(angle)),mul(cross(axis,v),Math.sin(angle))),mul(axis,dot(axis,v)*(1-Math.cos(angle))));
  }
  function landPetal(petal) {
    petal.settled=true;
    const sizes=[0,4,8].map(i=>Math.hypot(...petal.original.subarray(i,i+3)));
    const a=petal.yaw;
    petal.landedAxes=[mul([Math.cos(a),0,Math.sin(a)],sizes[0]),mul([-Math.sin(a),0,Math.cos(a)],sizes[1]),[0,sizes[2],0]];
    petal.position[1]=terrainHeight(petal.position[0],petal.position[2])+sizes[2]+.008;
    if(!bouquetMode&&!petal.keptOnGround) {
      const record=Array.from(petal.original);
      for(let i=0;i<3;i++)record.splice(i*4,3,...petal.landedAxes[i]);
      record.splice(12,3,...petal.position);
      record.splice(19,4,0,0,0,0);
      groundPetals.push(...record.map(value=>Math.round(value*100000)/100000));
      petal.keptOnGround=true;groundDirty=true;
      clearTimeout(groundSaveTimer);groundSaveTimer=setTimeout(saveGroundPetals,350);
    }
  }
  function settleRemainingPetals() {
    for(const bloom of fallingBlooms)for(const petal of bloom.falling) {
      if(petal.settled)continue;
      // Finish the same fall before leaving, so even an immediate page change keeps it.
      for(let step=0;step<300;step++) {
        petal.velocity[1]-=.85*.04;
        petal.position=petal.position.map((x,i)=>x+petal.velocity[i]*.04);
        if(petal.position[1]<=terrainHeight(petal.position[0],petal.position[2])+.06)break;
      }
      landPetal(petal);
    }
  }
  function restoreBloom(bloom) {
    clearTimeout(bloom.restoreTimer);
    for(const petal of bloom.falling) {
      if(!petal.settled)landPetal(petal);
      petalBatch.data.set(petal.original,petal.offset);markDirty(petal.offset);
    }
    bloom.active=false;fallingBlooms.delete(bloom);
  }
  function releasePetals(bloom) {
    bloom.active=true;bloom.age=0;
    bloom.falling=bloom.petals.map(offset=>{
      const original=petalBatch.data.slice(offset,offset+23),position=windPosition(original);
      const outward=normalize([original[12]-bloom.center[0],0,original[14]-bloom.center[2]]);
      const petal={offset,original,position,velocity:[outward[0]*(.3+random()*.25),.12+random()*.15,outward[2]*(.3+random()*.25)],
        spinAxis:normalize([random()-.5,random()-.5,random()-.5]),spin:(random()-.5)*3,yaw:random()*Math.PI*2,settled:false};
      if(motion.matches) {
        petal.position[0]+=outward[0]*.35;petal.position[2]+=outward[2]*.35;
        landPetal(petal);
      }
      return petal;
    });
    fallingBlooms.add(bloom);
    if(motion.matches) bloom.restoreTimer=setTimeout(()=>{restoreBloom(bloom);if(!contextLost)draw(performance.now());},3000);
    if(!frame&&!contextLost)draw(performance.now());
  }
  function updatePetals(delta) {
    for(const bloom of fallingBlooms) {
      if(!motion.matches)bloom.age+=delta;
      if(bloom.age>=5.4) {restoreBloom(bloom);continue;}
      for(const petal of bloom.falling) {
        const offset=petal.offset;
        if(bloom.age>=4.6) {
          // Regrow the flower while its fallen petals remain in their own ground batch.
          const t=Math.min(1,(bloom.age-4.6)/.8),size=Math.max(.001,t*t*(3-2*t));
          petalBatch.data.set(petal.original,offset);
          for(const i of [0,1,2,4,5,6,8,9,10])petalBatch.data[offset+i]*=size;
        } else {
          if(!petal.settled) {
            petal.velocity[1]-=.85*delta;
            petal.position=petal.position.map((x,i)=>x+petal.velocity[i]*delta);
            if(petal.position[1]<=terrainHeight(petal.position[0],petal.position[2])+.06)landPetal(petal);
          }
          for(let column=0;column<3;column++) {
            const axis=petal.settled?petal.landedAxes[column]:rotateVector(Array.from(petal.original.subarray(column*4,column*4+3)),petal.spinAxis,bloom.age*petal.spin);
            // The permanent copy now owns the landed petal; hide its animated instance.
            petalBatch.data.set(mul(axis,petal.keptOnGround?.001:1),offset+column*4);
          }
          petalBatch.data.set(petal.position,offset+12);
          petalBatch.data[offset+21]=0;
        }
        markDirty(offset);
      }
    }
    if(dirtyEnd>dirtyStart) {
      gl.bindBuffer(gl.ARRAY_BUFFER,petalBatch.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,dirtyStart*4,petalBatch.data.subarray(dirtyStart,dirtyEnd));
      dirtyStart=Infinity;dirtyEnd=0;
    }
  }
  const overInterface=target=>target instanceof Element&&target.closest(".card,.error-window,.secret-note,.journey-panel,.journey-header,.journey-nav,dialog,button,a,input,textarea,select");
  let press=null;
  window.addEventListener("pointerdown",event=>{
    press=!bouquetMode&&event.isPrimary&&event.button===0&&!overInterface(event.target)?{id:event.pointerId,x:event.clientX,y:event.clientY,dragging:false,target:event.target}:null;
    if(press)event.target.setPointerCapture?.(event.pointerId);
  },{passive:true});
  window.addEventListener("pointercancel",()=>{press=null;},{passive:true});
  window.addEventListener("pointerup",event=>{
    const start=press;press=null;
    if(!start||start.id!==event.pointerId)return;
    if(start.target.hasPointerCapture?.(event.pointerId))start.target.releasePointerCapture(event.pointerId);
    if(contextLost||start.dragging||overInterface(event.target)||Math.hypot(event.clientX-start.x,event.clientY-start.y)>8)return;
    const bloom=pickFlower(event.clientX,event.clientY,event.pointerType==="touch");
    if(bloom) {
      releasePetals(bloom);
      window.dispatchEvent(new CustomEvent("meadow:flower",{detail:{kind:bloom.kind}}));
    }
  },{passive:true});
  window.addEventListener("pointermove",event=>{
    if(bouquetMode)return;
    if(press?.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>8)press.dragging=true;
    if(motion.matches || event.pointerType==="touch")return;
    targetX=(event.clientX/innerWidth-.5)*.8;
    targetY=(event.clientY/innerHeight-.5)*.18;
  },{passive:true});
  function perspective(aspect) {
    const f=1/Math.tan(52*Math.PI/360),near=.1,far=100;
    return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  }
  function lookAt(eye,target) {
    const z=normalize(eye.map((x,i)=>x-target[i])),x=normalize(cross(up,z)),y=cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  }
  function resize() {
    if(contextLost)return;
    const ratio=Math.min(devicePixelRatio||1,mobile?1.25:1.6);
    canvas.width=Math.round((bouquetMode?canvas.clientWidth:innerWidth)*ratio);canvas.height=Math.round((bouquetMode?canvas.clientHeight:innerHeight)*ratio);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniformMatrix4fv(uniform.projection,false,perspective(canvas.width/canvas.height));
  }
  function draw(now) {
    if(contextLost)return;
    frame=0;
    cameraX+=(targetX-cameraX)*.035;cameraY+=(targetY-cameraY)*.035;
    giftYaw=motion.matches?targetGiftYaw:giftYaw+(targetGiftYaw-giftYaw)*.18;
    giftPitch=motion.matches?targetGiftPitch:giftPitch+(targetGiftPitch-giftPitch)*.18;
    const giftClose=bouquetMode&&document.body.classList.contains('bouquet-finished');
    const giftDistance=Math.max(giftClose?3.45:4.1,1.38/(Math.tan(26*Math.PI/180)*(canvas.width/canvas.height)));
    const eye=bouquetMode?[Math.sin(giftYaw)*Math.cos(giftPitch)*giftDistance,.16+Math.sin(giftPitch)*giftDistance,Math.cos(giftYaw)*Math.cos(giftPitch)*giftDistance]:[cameraX,2.5+cameraY,9];
    renderedEye=eye;renderedTarget=bouquetMode?[0,.16,0]:add(eye,[0,-1.95,-18]);renderedTime=motion.matches?0:now*.001;
    if(bouquetMode){canvas.dataset.yaw=String(giftYaw);canvas.dataset.pitch=String(giftPitch);}
    const delta=lastFrameTime?Math.min((now-lastFrameTime)*.001,.04):0;lastFrameTime=now;
    updatePetals(delta);
    if (butterflyBatch) {
      butterflyPose(renderedTime);
      butterflyBatch.data.set(butterflyParts);
      gl.bindBuffer(gl.ARRAY_BUFFER,butterflyBatch.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,butterflyBatch.data);
      const ahead=normalize(renderedTarget.map((value,i)=>value-renderedEye[i]));
      const across=normalize(cross(ahead,up)), skyUp=cross(across,ahead);
      const spread=Math.tan(26*Math.PI/180);
      const covered=Array.from(document.querySelectorAll('.card,.error-window,.secret-note,.journey-panel')).map(element=>element.getBoundingClientRect());
      butterflyCenters.forEach((center,i)=>{
        const relative=center.map((value,j)=>value-renderedEye[j]), distance=dot(relative,ahead);
        const x=(dot(relative,across)/(distance*spread*innerWidth/innerHeight)+1)*innerWidth/2;
        const y=(1-dot(relative,skyUp)/(distance*spread))*innerHeight/2;
        butterflyTargets[i].hidden=covered.some(rect=>x>=rect.left-6&&x<=rect.right+6&&y>=rect.top-6&&y<=rect.bottom+6);
        butterflyTargets[i].style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
      });
    }
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniform.view,false,lookAt(eye,renderedTarget));
    gl.uniform3fv(uniform.eye,eye);gl.uniform1f(uniform.time,renderedTime);
    for(const b of (bouquetMode?batches.slice(1):batches)) {gl.bindVertexArray(b.vao);gl.drawElementsInstanced(gl.TRIANGLES,b.count,gl.UNSIGNED_SHORT,0,b.instances);}
    if(groundPetalBatch) {
      if(groundDirty) {
        groundPetalBatch.data=new Float32Array(groundPetals);groundPetalBatch.instances=groundPetals.length/23;
        gl.bindBuffer(gl.ARRAY_BUFFER,groundPetalBatch.buffer);gl.bufferData(gl.ARRAY_BUFFER,groundPetalBatch.data,gl.DYNAMIC_DRAW);
        groundDirty=false;
      }
      gl.bindVertexArray(groundPetalBatch.vao);
      gl.drawElementsInstanced(gl.TRIANGLES,groundPetalBatch.count,gl.UNSIGNED_SHORT,0,groundPetalBatch.instances);
      canvas.dataset.fallenPetals=String(groundPetalBatch.instances);
    }
    if(wrappingBatches.length) {
      gl.enable(gl.CULL_FACE);
      for(const [i,b] of wrappingBatches.entries()) {
        if(i===wrappingBatches.length-1)gl.disable(gl.CULL_FACE);
        gl.bindVertexArray(b.vao);gl.drawElementsInstanced(gl.TRIANGLES,b.count,gl.UNSIGNED_SHORT,0,b.instances);
      }
      gl.disable(gl.CULL_FACE);
    }
    if(butterflyBatch) {gl.bindVertexArray(butterflyBatch.vao);gl.drawElementsInstanced(gl.TRIANGLES,butterflyBatch.count,gl.UNSIGNED_SHORT,0,butterflyBatch.instances);}
    canvas.dataset.ready="true";
    if(!motion.matches && !document.hidden)frame=requestAnimationFrame(draw);
  }
  function restart() {if(frame)cancelAnimationFrame(frame);frame=0;lastFrameTime=0;resize();draw(performance.now());}
  window.addEventListener("resize",restart);
  motion.addEventListener("change",()=>{for(const bloom of fallingBlooms)restoreBloom(bloom);restart();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else restart();});
  if(!bouquetMode) {
    window.addEventListener('pagehide',()=>{settleRemainingPetals();saveGroundPetals();});
    window.addEventListener('pageshow',event=>{if(event.persisted){loadGroundPetals();restart();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGroundPetals();});
  }
  // Preserve the form and page state if the GPU context becomes unavailable.
  canvas.addEventListener("webglcontextlost",()=>{contextLost=true;cancelAnimationFrame(frame);canvas.style.visibility="hidden";butterflyTargets.forEach(button=>{button.hidden=true;});});
  if(bouquetMode)window.addEventListener("bouquet:update",event=>{
    spheres.length=0;stems.length=0;flowers.length=0;
    const kinds=event.detail.kinds.filter(kind=>Number.isInteger(kind)&&kind>=0&&kind<=7);
    // Every picked flower is drawn. The spiral packs more stems into the wrapping
    // as the bouquet grows, rather than discarding flowers beyond a fixed count.
    const size=Math.max(.22,.88/Math.pow(Math.max(1,kinds.length/5),.28));
    seed=71432;
    kinds.forEach((kind,i)=>{
      const angle=i*2.39996323;
      const radius=kinds.length===1?0:.8*Math.sqrt((i+.5)/kinds.length);
      const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius*.55;
      const sphereStart=spheres.length,stemStart=stems.length;
      flower(x,z,size,kind,kinds.length===1?0:Math.atan2(x,z));
      const bloom=flowers[flowers.length-1];
      const headY=1.02+.25*(1-radius/.8)+Math.sin(angle)*.06;
      const shift=headY-bloom.center[1];
      for(const [values,start] of [[spheres,sphereStart],[stems,stemStart]]) {
        for(let offset=start;offset<values.length;offset+=23) {
          values[offset+13]+=shift;values[offset+19]+=shift;
        }
      }
      bloom.center[1]+=shift;bloom.wind[0]+=shift;
    });
    // Airy baby's breath and small sage leaves fill the rim without replacing picks.
    if(kinds.length)for(let i=0;i<9;i++) {
      const a=i*Math.PI*2/9+.2,x=Math.sin(a)*.85,z=Math.cos(a)*.43;
      const base=[x*.7,.35,z*.7],tip=[x,.95+(i%3)*.09,z];
      stem(base,tip,.009,[.47,.6,.36]);
      for(let j=0;j<3;j++) {
        const b=a+j*2.1,head=add(tip,[Math.cos(b)*.09,j*.035,Math.sin(b)*.07]);
        stem(add(base,mul(tip.map((n,k)=>n-base[k]),.7)),head,.005,[.57,.65,.43]);
        for(let k=0;k<5;k++) {
          const t=k*Math.PI*2/5;
          sphere(add(head,[Math.cos(t)*.024,Math.sin(t)*.024,0]),[.022,.022,.018],[1,.95,.88]);
        }
        sphere(head,[.013,.013,.019],[.95,.76,.42]);
      }
      const long=normalize([Math.sin(a)*.65,.7,Math.cos(a)*.4]);
      const across=normalize(cross(long,forward));
      sphere([x*.9,.7,z*.9],[.17,.055,.018],[.54,.67,.44],[long,across,cross(long,across)]);
    }
    canvas.dataset.flowerCount=String(kinds.length);
    for(const [batch,values] of [[batches[1],stems],[petalBatch,spheres]]) {
      batch.data=new Float32Array(values);batch.instances=values.length/23;
      gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);gl.bufferData(gl.ARRAY_BUFFER,batch.data,gl.DYNAMIC_DRAW);
    }
    restart();
  });
  restart();
  }
  const background=document.createElement("canvas");
  background.className="meadow-canvas";background.setAttribute("aria-hidden","true");document.body.prepend(background);
  createMeadow(background);
  const bouquet=document.querySelector("#bouquetCanvas");
  if(bouquet)createMeadow(bouquet,true);
})();
