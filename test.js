/**
 * 黑马记账单元测试 —— 零依赖，node test.js
 * 覆盖纯函数：金额/HTML转义/日期/分类查找/老数据迁移
 */
let passed = 0, failed = 0;
const fails = [];
function assert(name, actual, expected){
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if(ok){ passed++; console.log(`  ✓ ${name}`); }
  else { failed++; fails.push({name,actual,expected});
    console.log(`  ✗ ${name}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(actual)}`); }
}

/* ===== 复制黑马记账里的纯函数实现 ===== */
function fmtMoney(n){
  const v = Math.abs(n).toFixed(2);
  return (n<0?'-':'') + v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function monthLabel(m){ const [y,mo]=m.split('-'); return `${y}年${parseInt(mo,10)}月`; }
function shiftMonth(m, delta){
  let [y,mo]=m.split('-').map(Number); mo += delta;
  while(mo<1){mo+=12;y--} while(mo>12){mo-=12;y++}
  return `${y}-${String(mo).padStart(2,'0')}`;
}
function txnsInMonth(list, month){ return list.filter(t=>t.date.startsWith(month)); }
function acctBalance(acc, txns){
  const out = txns.filter(t=>t.accountId===acc.id&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const inc = txns.filter(t=>t.accountId===acc.id&&t.type==='income').reduce((s,t)=>s+t.amount,0);
  return acc.initial + inc - out;
}

/* 两级分类数据（与 HTML 里一致） */
const EXPENSE_GROUPS = [
  {id:'food', name:'餐饮', color:'#e8a85c', icon:'bowl', subs:[
    {id:'food_breakfast', name:'早餐'},{id:'food_lunch', name:'午餐'},{id:'food_dinner', name:'晚餐'}]},
  {id:'other', name:'其他', color:'#8a91a8', icon:'dots', subs:[{id:'other_exp', name:'其他支出'}]},
];
const INCOME_GROUPS = [
  {id:'salary', name:'工资', color:'#5ec98a', icon:'wallet', subs:[{id:'salary_monthly', name:'月薪'}]},
];
let userSubs = [];
function getCats(type){ return type==='expense'?EXPENSE_GROUPS:INCOME_GROUPS; }
function findSub(type, subId){
  const groups = getCats(type);
  for(const g of groups){
    const s = g.subs.find(x=>x.id===subId);
    if(s) return {group:g, sub:s};
  }
  const u = userSubs.find(x=>x.id===subId);
  if(u) return {group:{id:u.groupId,name:u.groupName,color:u.color,icon:u.icon}, sub:u};
  return {group:{name:'未知',color:'#888',icon:'dots'}, sub:{name:'未知'}};
}
function findCat(type, id){
  const {group, sub} = findSub(type, id);
  return {name: sub.name, color: group.color, icon: group.icon};
}

/* ===== 测试用例 ===== */
console.log('\n【fmtMoney】金额格式化');
assert('整数', fmtMoney(1000), '1,000.00');
assert('小数两位', fmtMoney(12.5), '12.50');
assert('负数', fmtMoney(-45.67), '-45.67');
assert('0', fmtMoney(0), '0.00');

console.log('\n【esc】HTML 转义');
assert('转义 <>', esc('<script>'), '&lt;script&gt;');
assert('转义引号', esc('He said "hi"'), 'He said &quot;hi&quot;');
assert('null 不报错', esc(null), '');

console.log('\n【shiftMonth】跨年');
assert('12月→次年1月', shiftMonth('2026-12', 1), '2027-01');
assert('1月→上年12月', shiftMonth('2026-01', -1), '2025-12');

console.log('\n【findSub】两级分类查找');
// 内置小类
const r1 = findSub('expense','food_lunch');
assert('找到大类名', r1.group.name, '餐饮');
assert('找到小类名', r1.sub.name, '午餐');
// 用户自建小类
userSubs.push({id:'u_1', groupId:'food', groupName:'餐饮', name:'奶茶', color:'#e8a85c', icon:'bowl'});
const r2 = findSub('expense','u_1');
assert('用户自建小类能找到', r2.sub.name, '奶茶');
assert('用户自建小类归属大类', r2.group.name, '餐饮');
// 不存在的 id
const r3 = findSub('expense','not_exist');
assert('未知 id 返回兜底', r3.sub.name, '未知');

console.log('\n【findCat】兼容旧调用');
const c = findCat('expense','food_lunch');
assert('小类名', c.name, '午餐');
assert('大类颜色', c.color, '#e8a85c');

console.log('\n【老数据迁移】legacyMap');
const legacyMap = {food:'food_lunch',grocer:'grocer_veg',other:'other_exp',salary:'salary_monthly'};
const oldTxns = [{category:'food'},{category:'salary'},{category:'food_lunch'}];
oldTxns.forEach(t=>{ if(legacyMap[t.category]) t.category = legacyMap[t.category]; });
assert('旧 food → food_lunch', oldTxns[0].category, 'food_lunch');
assert('旧 salary → salary_monthly', oldTxns[1].category, 'salary_monthly');
assert('新 id 不被改', oldTxns[2].category, 'food_lunch');

console.log('\n【acctBalance】账户余额');
const cash = {id:'a_cash', initial:100};
const txns = [
  {accountId:'a_cash', type:'expense', amount:30},
  {accountId:'a_cash', type:'income', amount:50},
];
assert('100+50-30=120', acctBalance(cash, txns), 120);

/* ===== 汇总 ===== */
console.log(`\n========================================`);
console.log(`通过 ${passed} · 失败 ${failed}`);
if(failed>0) process.exit(1);
