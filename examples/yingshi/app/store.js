'use strict';

const reviewState = new URLSearchParams(location.search).get('review');
const reviewRecords = reviewState ? new Map() : null;

// IndexedDB transactions serialize payment callbacks and job settlements across tabs.
const database = reviewRecords ? null : new Promise((resolve, reject) => {
  const request = indexedDB.open('yingshi-local-demo-v1', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('records');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function readRecord(key) {
  if (reviewRecords) return structuredClone(reviewRecords.get(key));
  const db = await database;
  return new Promise((resolve, reject) => {
    const request = db.transaction('records').objectStore('records').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateRecord(key, initial, change) {
  if (reviewRecords) {
    const value = change(structuredClone(reviewRecords.get(key) ?? initial));
    reviewRecords.set(key, structuredClone(value));
    return value;
  }
  const db = await database;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const records = tx.objectStore('records');
    const get = records.get(key);
    let value;
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(tx.error || new Error('本地保存失败'));
    get.onsuccess = () => {
      try {
        value = change(get.result ?? initial);
        records.put(value, key);
      } catch (error) {
        tx.abort();
        reject(error);
      }
    };
  });
}
const emptyAccount = () => ({ grants: [], order: null, jobs: [] });
const available = a => a.grants.reduce((n,g) => n + (g.expires > Date.now() ? g.left : 0), 0);
const pending = a => a.jobs.find(j => ['running','unknown'].includes(j.status));
const uid = () => crypto.randomUUID();

async function changeAccount(owner, change) {
  if (!owner) throw new Error('请先登录演示账号');
  return updateRecord('account:'+owner, emptyAccount(), account => { change(account); return account; });
}
function createOrder(owner) {
  return changeAccount(owner, a => {
    if (a.order?.status !== 'waiting') a.order = { id:uid(), status:'waiting' };
  });
}
function finishOrder(owner, id, outcome) {
  return changeAccount(owner, a => {
    if (a.order?.id !== id || a.order.status !== 'waiting') return;
    a.order.status = outcome;
    if (outcome === 'paid') {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear()+1);
      a.grants.push({id, left:15, expires:expiry.getTime()});
    }
  });
}
function reserveJob(owner, spec) {
  return changeAccount(owner, a => {
    if (pending(a)) return;
    const grant = a.grants.find(g => g.expires > Date.now() && g.left > 0);
    if (!grant) throw new Error('需要补充生成张数');
    grant.left--;
    a.jobs.unshift({...spec, id:uid(), charge:grant.id, status:'running', created:Date.now(), due:Date.now()+2400});
  });
}
function settleJob(owner, id, query=false) {
  return changeAccount(owner, a => {
    const job = a.jobs.find(j => j.id === id);
    if (!job || !['unknown','running'].includes(job.status) || Date.now()<job.due) return;
    if (job.status === 'unknown' && !query) return;
    if (job.scenario === 'unknown' && !query) {
      job.status='unknown';
      return;
    }
    job.status = ['failed','blocked'].includes(job.scenario) ? job.scenario : 'done';
    if (job.status !== 'done') a.grants.find(g => g.id===job.charge).left++;
  });
}
