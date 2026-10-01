import {createSlotPaint} from '../freestanding-vanity/paint'
export const bathFinishLabels={shell:'Bath exterior',plumbing:'Waste and overflow pipes',interior:'Interior and rim',base:'Feet and pedestal',apron:'Front apron',drain:'Drain cover',overflow:'Overflow trim',seat:'Bath seat',door:'Access door',seal:'Door seal',handle:'Door and grab handles'}
export const bathPaint=createSlotPaint((v):v is keyof typeof bathFinishLabels=>typeof v==='string'&&Object.hasOwn(bathFinishLabels,v),.22)
