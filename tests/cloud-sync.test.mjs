import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudWorkbook} from '../src/cloud-sync.mjs';
const disk=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const remote=()=>{let data={};return{load:async()=>({data:{...data}}),save:async patch=>{data={...data,...patch};return{data:{...data}}}}};
test('a clean browser restores server answers after signing into the same account',async()=>{
 const api=remote(),first=createCloudWorkbook({api,storage:disk(),userId:'alice'});
 await first.load();first.update('reason','Научиться создавать сайты');first.update('programRead',true);await first.flush();first.destroy();
 const second=createCloudWorkbook({api,storage:disk(),userId:'alice'});await second.load();
 assert.deepEqual(second.state.answers,{reason:'Научиться создавать сайты',programRead:true});second.destroy();
});
test('failed save is reported and its draft survives reload without leaking into another account',async()=>{
 const storage=disk(),api=remote(),normalSave=api.save;api.save=async()=>{throw new Error('Network down')};
 const first=createCloudWorkbook({api,storage,userId:'alice'});await first.load();first.update('reason','Сохранить');assert.equal(await first.flush(),false);assert.equal(first.state.status,'error');first.destroy();
 const bob=createCloudWorkbook({api:remote(),storage,userId:'bob'});await bob.load();assert.deepEqual(bob.state.answers,{});bob.destroy();
 api.save=normalSave;const restored=createCloudWorkbook({api,storage,userId:'alice'});await restored.load();assert.equal(restored.state.answers.reason,'Сохранить');await restored.flush();assert.equal((await api.load()).data.reason,'Сохранить');restored.destroy();
});
test('an edit made during saving is sent afterwards and never cleared by the old response',async()=>{
 const api=remote(),original=api.save;let release;api.save=patch=>new Promise(resolve=>{release=async()=>resolve(await original(patch))});
 const book=createCloudWorkbook({api,storage:disk(),userId:'alice'});await book.load();book.update('reason','Первый текст');const saving=book.flush();book.update('reason','Новый текст');assert.equal(typeof release,"function");await release();await saving;api.save=original;await book.flush();assert.equal((await api.load()).data.reason,'Новый текст');book.destroy();
});
test('closed access cannot appear as an empty or successfully saved workbook',async()=>{
 const book=createCloudWorkbook({api:{load:async()=>{throw new Error('ACCESS_CLOSED')},save:async()=>{throw new Error('ACCESS_CLOSED')}},storage:disk(),userId:'alice'});
 await book.load();assert.equal(book.state.ready,false);assert.equal(book.state.status,'error');assert.match(book.state.error,/доступ/i);book.destroy();
});
test('logging out cancels queued saves and late loads do not update the next account',async()=>{
 let resolve;const book=createCloudWorkbook({api:{load:()=>new Promise(r=>{resolve=r}),save:async()=>{throw new Error('should not save')}},storage:disk(),userId:'alice'});
 const loading=book.load();book.destroy();assert.equal(typeof resolve,'function');resolve({data:{reason:'Old account'}});await loading;assert.deepEqual(book.state.answers,{});
});
