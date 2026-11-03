import {taxonomy} from './ai-taxonomy.js?v=6';

// Referência única para os grupos permitidos, usada por Admin e Lojista.
export const groupsByCategory=Object.fromEntries(Object.entries(taxonomy).map(([category,groups])=>[category,Object.keys(groups||{}).filter(group=>group&&group!==category)]));
export const allowedGroups=category=>groupsByCategory[category]||[];
export const isValidStoreGroup=(category,group)=>!!group&&allowedGroups(category).includes(group);
