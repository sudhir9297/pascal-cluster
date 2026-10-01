import {type BufferGeometry} from 'three'
/** Partition existing triangles; preserve the welded normals, metre UVs and exact seam coordinates. */
export function partitionBathSurface(geometry:BufferGeometry,inside:(triangleOffset:number)=>boolean){
 const indices=geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.getAttribute('position').count},(_,i)=>i),outer:number[]=[],inner:number[]=[]
 for(let i=0;i<indices.length;i+=3)(inside(i)?inner:outer).push(indices[i]!,indices[i+1]!,indices[i+2]!)
 const result=[outer,inner].map(indices=>{const g=geometry.clone();g.clearGroups();g.setIndex(indices);return g}) as [BufferGeometry,BufferGeometry]
 geometry.dispose();return result
}
