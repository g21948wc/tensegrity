import {useThree, Canvas, extend, ReactThreeFiber } from '@react-three/fiber';
import { Text,PerspectiveCamera } from '@react-three/drei';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {subtract, eigs, evaluate, number, identity, norm, pow,  matrix, multiply } from 'mathjs';
import { useControls } from 'leva';
import * as THREE from 'three';
import {useState } from 'react';
import { useGesture } from "@use-gesture/react";

extend({OrbitControls});
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'orbitControls': ReactThreeFiber.Object3DNode<OrbitControls, typeof OrbitControls>;
    }
  }
}

function App() {
  const bind = useGesture({
    onDrag: ({ event }) => event.preventDefault(),
    onPinch: ({ event }) => event.preventDefault(),
  });

  return (
    <>
      <div style={{width:"200dvh",height:"100dvh"}}>
      <Canvas {...bind()} >
      <ambientLight intensity={0.5} />
      <directionalLight  position={[0, 0, 5]} />
      <Set/>
      </Canvas>
      </div>
      </>
  );
}

function Set(){

  extend({ OrbitControls })
  const {camera, gl} = useThree()
  //console.log(useThree());
  //camera.addEventListener( 'change', ()=>{console.log("changed");} );

  let start:any = multiply([1,0.618034,-0.472136],1.0);
  const { x, strut ,cable, label} = useControls({x:{value:0.5,min:0,max:1,step:0.025},
						 strut:true,
						 cable:true,
						 label:true
					 });
  const ystr = "1/2*(x^2*(sqrt(5) - 3) - 4*x*(sqrt(5) - 2) - sqrt(5) - sqrt(-10*x^4*(3*sqrt(5) - 7) - 8*x^3*(3*sqrt(5) - 5) - 8*x^2*(3*sqrt(5)-10) + 8*x*(sqrt(5) - 5) - 10*sqrt(5) + 30) + 5)/(x*(sqrt(5) - 1) + sqrt(5) - 5)";
  const OmegaString = [["-1/2*x*(sqrt(5) + 1) + 1/4*(x - 1)*(sqrt(5) - 1) + x + 1",
			"-1/2*x*(sqrt(5) - 1) + 1/2*x - 1/2",
			"-1/4*(x - 1)*(sqrt(5) + 1)"],
		       ["-1/2*x*(sqrt(5) - 1) + 1/2*x - 1/2",
			"-1/4*(x - 1)*(sqrt(5) + 1) + 2*y + 1",
			"-1/4*(x - 1)*(sqrt(5) - 1)"],
		       ["-1/4*(x - 1)*(sqrt(5) + 1)",
			"-1/4*(x - 1)*(sqrt(5) - 1)",
			"-1/2*x*(sqrt(5) - 1) + 1/2*x + 2*y + 3/2"]
		      ];
  let y = evaluate(ystr.replace(/x/g,String(x)));
  const Omega:any = identity(3);
  for (let i=0; i<3; i++){
    for (let j=0; j<3; j++){
      Omega.set([i,j],evaluate((OmegaString[i][j]).replace(/x/g,String(x)).replace(/y/g,String(y))));
    }
  }
  start = eigs(Omega).eigenvectors[0].vector.valueOf();
  const matrices = makeMatrix();
  const [rot, setRot] = useState([0,0,0]);
  const camwatch = ()=>{
    //@ts-ignore TS6133: 'rot' is declared but its value is never read.
    setRot(rot => camera?.rotation.toArray());
    //console.log(rot);
  };
  
  return (
    <>
      <mesh onPointerMove={() => camwatch()} onPointerUp={() => camwatch()}>
      <PerspectiveCamera makeDefault  {...{ position: [0, 1.8, 5], fov: 25 }} />
      <orbitControls args={ [ camera, gl.domElement ] }  />
      <Tensegrity p0={start} matrices={matrices} strut={strut} cable={cable} label={label} rot={rot}/>
      </mesh>
      </>
  );

}


function Tensegrity({p0,matrices,strut,cable,label,rot}:{p0:any, matrices:any, strut:boolean,cable:boolean,label:boolean,rot:any}) {
  if (strut && cable){
    return (
      <>
        <Vertices p0={p0} matrices={matrices} label={label} rotation={rot}/>
        <Struts p0={p0}   matrices={matrices}/>
        <Cables p0={p0}   matrices={matrices}/>
	</>
    );
  }
  else if (!strut && cable) {
    return(
      <>
        <Vertices p0={p0} matrices={matrices} label={label} rotation={rot}/>
        <Cables p0={p0} matrices={matrices}/>
	</>
    );
  }
  else if (strut && !cable) {
    return(
      <>
        <Vertices p0={p0} matrices={matrices} label={label} rotation={rot}/>
        <Struts p0={p0} matrices={matrices}/>
	</>
    );
  }
  else {
    return(
      <>
        <Vertices p0={p0} matrices={matrices} label={label} rotation={rot}/>
	</>
    );
  }
}


function makeMatrix(){

  const A= matrix([[0,1,0],[0,0,1],[1,0,0]]);
  const B= matrix([[-1,0,0],[0,-1,0],[0,0,1]]);
  const C= matrix([[1,0,0],[0,-1,0],[0,0,-1]]);
  const tau= (1+Math.sqrt(5))/2;
  const dtau= (1-Math.sqrt(5))/2;
  const D= matrix([[1/2,tau/2,dtau/2],[-tau/2,-dtau/2,-1/2],[dtau/2,1/2,tau/2]]);

  const rawMatrices=[]; 
  for(let a of [0,1,2]){
    for(let b of [0,1]){
      for(let c of [0,1]){
        for(let d of [0,1,2,3,4]){
          let M:any = multiply(multiply(pow(A,a),multiply(pow(B,b),(pow(C,c)))),pow(D,d));// A^a*B^b* C^c * D^d
          rawMatrices.push(M);
        }
      }
    }
  }
  
  return rawMatrices;
}

function reducedIndices(p0:any, matrices:any){
  
  const indices = Array(matrices.length);
  let count = 0;
  for (let i = 0; i < matrices.length; i++){
    if (indices[i] === undefined){
      indices[i] = count;
      for (let j = i+1; j < matrices.length; j++){
	if (number(norm(
	  //@ts-ignore TS2345: Argument of type 'MathScalarType' is not assignable to parameter of type 'number | BigNumber | Complex | MathCollection<MathNumericType>'.
	  subtract(multiply(matrices[i],p0), multiply(matrices[j],p0)),
	  2)) < 0.001){
	  indices[j]=count;
	}
      }
      count++;
    }
  }
  return indices;
}


function Vertex({p, idx, label, rotation}:{p:any, idx:number, label: boolean, rotation:any}){
  //console.log(rotation);
  if (label){
    return(
      <group position={p} rotation={rotation}> 
	<mesh>
	<sphereGeometry  args={[0.02, 32, 32]} />
	<meshStandardMaterial color={"navy"}/>
	</mesh>
	<Text
      position={[0, 0.05, 0]} // 頂点から少し上にオフセット
      fontSize={0.1}
      color="red"
      anchorX="center"
      anchorY="middle"
	>
	{idx}
      </Text>
	</group>
    );
  }
  else{
    return(
      <group position={p}> 
	<mesh>
	<sphereGeometry  args={[0.02, 32, 32]} />
	<meshStandardMaterial color={"navy"}/>
	</mesh>
	</group>
    );
  }
}

/*
function listC1(matrices:any, p0:any, ridx:any){
  const tau= (1+Math.sqrt(5))/2;
  const C1= matrix([[1/2*tau, 1/2*tau - 1/2,1/2],
		    [1/2*tau - 1/2, 1/2,-1/2*tau],
		    [-1/2, 1/2*tau ,1/2*tau - 1/2]]);
  const edges = []
  for (let i in matrices){
    const p:any = multiply(multiply(matrices[i],C1),p0);
    for (let j in matrices){
      const q:any = multiply(matrices[j],p0);
      if (number(norm(subtract(p,q),2))<0.01){
    	edges.push([ridx[i],ridx[j]]);
	break;
      }
    }
  }
  return edges;
}
*/

/*
function listS1(matrices:any, p0:any, ridx:any){
  const S = matrix([[1,0,0],[0,-1,0],[0,0,-1]]);
  const edges = []
  for (let i in matrices){
    const p:any = multiply(multiply(matrices[i],S),p0);
    for (let j in matrices){
      const q:any = multiply(matrices[j],p0);
      if (number(norm(subtract(p,q),2))<0.01){
    	edges.push([ridx[i],ridx[j]]);
	break;
      }
    }
  }
  return edges;
}
*/

function Vertices({p0,matrices,label,rotation}:{p0:any, matrices:any, label:boolean, rotation:any}){
  //const matrices = makeMatrix(p0);
  const rids = reducedIndices(p0,matrices);
  return matrices.map((M:any,idx:any)=>
    <Vertex key={M.valueOf().toString()} p={multiply(M,p0).valueOf()} idx={rids[idx]} label={label} rotation={rotation}/>);
}

function Member({p,q,mwidth,col}:{p:any,q:any,mwidth:number,col:string}){
  const v = [q[0]-p[0],q[1]-p[1],q[2]-p[2]];
  const m = [(q[0]+p[0])/2,(q[1]+p[1])/2,(q[2]+p[2])/2];
  let theta = Math.atan(v[2]/v[1]);
  
  if (Math.abs(v[1])<0.001){
    theta = Math.PI/2;
  }
  const phi = Math.acos((v[1]*Math.cos(theta)+v[2]*Math.sin(theta))/number(norm(v,2)));
  let sgn = 1;
  if (v[0]>0){
    sgn =-1;
  }
  
  return(
    <mesh position={new THREE.Vector3(m[0],m[1],m[2])} rotation={new THREE.Euler(theta,0,sgn*phi)} >
      <cylinderGeometry  args={[mwidth,mwidth,number(norm(v,2)),32]} />
      <meshStandardMaterial color={col}/>
    </mesh>
  );
}

function Strut({p,q}:{p:any,q:any}){
  return(
    <Member p={p} q={q} mwidth={0.01} col="yellow"/>
  );
}

function Struts({p0, matrices}:{p0:any, matrices:any}){
  const S= matrix([[1,0,0],[0,-1,0],[0,0,-1]]);
  //const matrices = makeMatrix(p0);
  return matrices.map(
    (M:any)=><Strut key={M.valueOf().toString()+S.valueOf().toString()}
    p={multiply(M,p0).valueOf()} 
    q={multiply(multiply(M,S),p0).valueOf()}/>);      }

function Cable({p,q}:{p:any,q:any}){
  return(
    <Member p={p} q={q} mwidth={0.0025} col={"white"} />
  );
}

function Cables({p0,matrices}:{p0:any, matrices:any}){
  const tau= (1+Math.sqrt(5))/2;
  const C1= matrix([[1/2*tau, 1/2*tau - 1/2,1/2],
		    [1/2*tau - 1/2, 1/2,-1/2*tau],
		    [-1/2, 1/2*tau ,1/2*tau - 1/2]]);
  
  const C2= matrix([[ 1/2*tau - 1/2, 1/2,-1/2*tau],
		    [1/2, -1/2*tau, -1/2*tau + 1/2],
		    [-1/2*tau, -1/2*tau + 1/2,-1/2]]);
  //const matrices = makeMatrix(p0);
  const c1 = matrices.map((M:any)=><Cable key={M.valueOf().toString()+C1.valueOf().toString()} p={multiply(M,p0).valueOf()}
                          q={multiply(multiply(M,C1),p0).valueOf()}/>);                               
  const c2 = matrices.map((M:any)=><Cable key={M.valueOf().toString()+C2.valueOf().toString()} p={multiply(M,p0).valueOf()}
                                q={multiply(multiply(M,C2),p0).valueOf()}/>);
                                
  return(c1.concat(c2));
}

export default App
