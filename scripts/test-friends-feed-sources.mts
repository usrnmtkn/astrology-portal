import assert from "node:assert/strict";
import { createServer } from "vite";
import { getAstrodienstSky } from "../apps/web/src/services/ephemeris.ts";
import type { ManualChart } from "../apps/web/src/services/manualCharts.ts";
import type { ConnectedSocialFriend } from "../apps/web/src/services/socialFriends.ts";

const server=await createServer({root:"./apps/web",appType:"custom",logLevel:"silent",server:{middlewareMode:true}});
try {
const { friendsFeedPeople, isFriendsFeedFilter, readFriendsFeedFilter, saveFriendsFeedFilter, selectFriendsFeedPeople } = await server.ssrLoadModule("/src/features/friends/friendsFeedSources.ts") as typeof import("../apps/web/src/features/friends/friendsFeedSources.ts");

const natal={...await getAstrodienstSky({label:"Synthetic location",latitude:0,longitude:0,timeZone:"UTC"},new Date("1990-01-01T12:00:00Z"),{includeDailyEvents:false}),birthTimeKnown:true};
const owner="synthetic-owner";
const chart:ManualChart={id:"same-id",ownerUserId:owner,chartType:"person",displayName:"Saved Person",pronouns:"name_only",birthDate:"1990-01-01",birthTime:"12:00",birthTimeUnknown:false,birthPlace:"Synthetic location",birthLocation:natal.location,natalChart:natal,createdAt:"2026-01-01T00:00:00Z",updatedAt:"2026-01-01T00:00:00Z",syncStatus:"synced"};
const friend:ConnectedSocialFriend={friendshipId:"synthetic-friendship",userId:"same-id",handle:"synthetic_friend",displayName:"Circle Person",natalChart:natal,viewerSharesChart:true,friendSharesChart:true,acceptedAt:chart.createdAt};
const people=friendsFeedPeople([friend],[chart,{...chart,id:"foreign",ownerUserId:"another-owner"},{...chart,id:"event",chartType:"event"},{...chart,id:"partial",natalChart:{...natal,positions:[]}}],owner);
assert.deepEqual(people.map(p=>p.id),["same-id","chart:same-id"],"Circle user and saved chart identifiers cannot collide; foreign/event/incomplete charts stay out of personal forecasts.");
assert.deepEqual(selectFriendsFeedPeople(people,"all").map(p=>p.displayName),["Circle Person","Saved Person"]);
assert.deepEqual(selectFriendsFeedPeople(people,"circle").map(p=>p.displayName),["Circle Person"]);
assert.deepEqual(selectFriendsFeedPeople(people,"charts").map(p=>p.displayName),["Saved Person"]);
assert.equal(friendsFeedPeople([{...friend,friendSharesChart:false}],[chart],owner).length,1,"A saved chart does not depend on Circle sharing.");
assert.equal(friendsFeedPeople([{...friend,viewerSharesChart:false}],[],owner)[0].canCompare,false,"Revoked viewer sharing disables a Circle composite.");
assert.equal(friendsFeedPeople([],[chart],owner).length,1,"An empty Circle does not suppress saved charts.");
assert.deepEqual(["all","circle","charts","same-id","invalid"].map(isFriendsFeedFilter),[true,true,true,false,false]);
assert.equal(readFriendsFeedFilter(owner),"all","Unavailable storage defaults to All.");
const storage=new Map<string,string>();
Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
saveFriendsFeedFilter(owner,"circle");assert.equal(readFriendsFeedFilter(owner),"circle");
assert.equal(readFriendsFeedFilter("another-owner"),"all","Selections are isolated per owner.");
storage.set(`tldrastro:friendsFeedSource:${owner}`,"old-person-id");assert.equal(readFriendsFeedFilter(owner),"all");
console.log("Friends feed sources: All/Circle/Charts, saved chart access, identity collisions, consent, completeness and owner-scoped persistence passed.");
} finally { await server.close(); }
