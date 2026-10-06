import {expect,test} from 'bun:test'
import {CountertopBasinNode,WallHungBasinNode,UndermountBasinNode,DropInBasinNode,SemiRecessedBasinNode,FullPedestalBasinNode,HalfPedestalBasinNode,BasinNode} from './schema'
import {basinSizeOptions} from './size-options'
import {basinSection} from '../section/basin-section'
import {boundedDimensionValue} from '../section/model'
import {createDimensionEdit} from '../section/edit-session'
test('product snapping uses published discrete dimensions and commits one complete edit',()=>{
 const node=CountertopBasinNode.parse({shape:'round',width:.42})
 const field=basinSection(node).dimensions.find(field=>field.key==='width')!
 expect(boundedDimensionValue(field,.421)).toBe(.43)
 expect(boundedDimensionValue(field,.3)).toBe(.4)
 expect(boundedDimensionValue(field,.8)).toBe(.43)
 expect(boundedDimensionValue({...field,snapValues:undefined},.421)).toBe(.42)
 const commits:unknown[]=[]
 const edit=createDimensionEdit(field,{preview:()=>{},clear:()=>{},commit:patch=>commits.push(patch)})
 edit.preview(.41);edit.preview(.429);edit.finish(true);edit.finish(true)
 expect(commits).toEqual([{width:.43}])
})
test('size references fit the schema, preserve mounting/finishes, and exclude ambiguous inset sizes',()=>{
 for(const node of [CountertopBasinNode.parse({shape:'round'}),CountertopBasinNode.parse({shape:'oval'}),CountertopBasinNode.parse({shape:'rectangle'}),WallHungBasinNode.parse({}),FullPedestalBasinNode.parse({}),HalfPedestalBasinNode.parse({}),SemiRecessedBasinNode.parse({}),UndermountBasinNode.parse({}),DropInBasinNode.parse({shape:'round'})]){
  for(const option of basinSizeOptions(node))expect(BasinNode.safeParse({...node,...option.patch}).success).toBe(true)
 }
 const inset=UndermountBasinNode.parse({shape:'oval',flangeWidth:.03})
 const insetPatch=basinSizeOptions(inset)[0]!.patch
 expect(insetPatch.width!+2*inset.flangeWidth).toBeCloseTo(.433)
 expect(insetPatch.depth!+2*inset.flangeWidth).toBeCloseTo(.352)
 const drop=DropInBasinNode.parse({shape:'round'})
 const dropPatch=basinSizeOptions(drop)[0]!.patch
 expect(dropPatch.width!+2*drop.flangeWidth).toBeCloseTo(.483)
 expect(dropPatch.height!+drop.rimHeight).toBeCloseTo(.187)
 expect(basinSizeOptions(UndermountBasinNode.parse({shape:'rectangle'}))[0]!.patch.height).toBe(.172)
 const node=CountertopBasinNode.parse({position:[1,.8,2],slots:{shell:'ceramic'}})
 const resized=BasinNode.parse({...node,...basinSizeOptions(node)[0]?.patch})
 expect(resized.position).toEqual(node.position)
 expect(resized.slots).toEqual(node.slots)
 expect(BasinNode.safeParse({...node,wallThickness:.005}).success).toBe(true)
})

test('every basin mounting and shape has width and elevation snap stops',()=>{
 const schemas=[CountertopBasinNode,UndermountBasinNode,DropInBasinNode,SemiRecessedBasinNode,WallHungBasinNode,FullPedestalBasinNode,HalfPedestalBasinNode]
 for(const schema of schemas)for(const shape of ['round','oval','rectangle']){
  const node=BasinNode.parse(schema.parse({shape}))
  const model=basinSection(node)
  for(const key of ['width',node.type==='bath-space:full-pedestal-basin'?'totalHeight':'elevation']){
   const field=model.dimensions.find(field=>field.key===key)!
   expect(field.snapValues?.length).toBeGreaterThan(0)
   for(const value of field.snapValues!){
    expect(value).toBeGreaterThanOrEqual(field.min)
    expect(value).toBeLessThanOrEqual(field.max)
    expect(BasinNode.safeParse({...node,...(field.patch?.(value)??{[key]:value})}).success).toBe(true)
   }
  }
  const depth=model.dimensions.find(field=>field.key==='depth')
  if(depth)expect(depth.snapValues?.length).toBeGreaterThan(0)
 }
})

test('bowl height is adjusted from the top without moving the basin base',()=>{
 const node=CountertopBasinNode.parse({height:.15,position:[1,.8,2]})
 const field=basinSection(node).dimensions.find(field=>field.key==='height')!
 expect(field.direction).toBe(-1)
 expect(field.start).toBeCloseTo(.15)
 expect(field.snapValues).toBeUndefined()
 expect(boundedDimensionValue(field,.135)).toBe(.135)
 const commits:Record<string,unknown>[]=[]
 const edit=createDimensionEdit(field,{preview:()=>{},clear:()=>{},commit:patch=>commits.push(patch)})
 edit.preview(.135);edit.finish(true)
 expect(commits).toEqual([{height:.135}])
 expect(CountertopBasinNode.parse({...node,...commits[0]}).position).toEqual(node.position)
})
