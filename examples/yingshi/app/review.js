// Review states initialize the same studio views with independent, in-memory data.
function seedReview(key, samplePrompt) {
  const states = {
    guest: {},
    'reference-added': { text: samplePrompt, reference: true },
    'reference-error': { fileError: '请选择 JPG、PNG 或 WebP 图片。' },
    'prompt-required': { textError: '请先写下你想生成的画面。' },
    login: { sheet: 'login' },
    code: { sheet: 'code', email: 'review@yingshi.example' },
    buy: { member: true, sheet: 'buy' },
    'payment-waiting': { member: true, sheet: 'waiting', payment: 'waiting' },
    'payment-canceled': { member: true, sheet: 'canceled', payment: 'canceled' },
    'payment-failed': { member: true, sheet: 'payfail', payment: 'failed' },
    'payment-succeeded': { member: true, sheet: 'paid', payment: 'paid', balance: 15 },
    running: { view: 'job', job: 'running', balance: 14 },
    unknown: { view: 'job', job: 'unknown', balance: 14 },
    done: { view: 'job', job: 'done', balance: 14 },
    failed: { view: 'job', job: 'failed', balance: 15 },
    blocked: { view: 'job', job: 'blocked', balance: 15 },
    again: { view: 'job', job: 'done', balance: 14, sheet: 'again' },
    'library-empty': { view: 'library', member: true, balance: 15 },
    library: { view: 'library', job: 'done', balance: 14 },
    detail: { view: 'detail', job: 'done', balance: 14 },
  };
  if (!Object.hasOwn(states, key)) throw new Error('找不到该评审状态。');

  const state = states[key];
  const owner = state.member || state.job ? 'review@yingshi.example' : '';
  const now = Date.now();
  const orderId = 'review-order';
  const jobId = 'review-florals';
  const account = emptyAccount();
  if (state.payment) account.order = { id: orderId, status: state.payment };
  if (state.balance) account.grants.push({ id: orderId, left: state.balance, expires: now + 365 * 86400000 });
  if (state.job) {
    account.jobs.push({
      id: jobId,
      charge: orderId,
      text: samplePrompt,
      ref: null,
      ratio: '1:1',
      img: 'app/assets/square.jpg',
      status: state.job,
      scenario: state.job,
      created: now,
      // Keep the captured running state available throughout the review.
      due: state.job === 'running' ? null : now,
    });
  }

  const text = state.text || (state.sheet || state.job ? samplePrompt : '');
  const ref = state.reference ? { id: 'review-reference', name: '午后花器.jpg', width: 1024, height: 1024 } : null;
  reviewRecords.set('draft:' + (owner || 'guest'), { text, ratio: text ? '1:1' : '自动', ref });
  if (ref) reviewRecords.set('image:' + ref.id, sample);
  if (owner) reviewRecords.set('account:' + owner, account);

  return {
    owner,
    view: state.view || 'create',
    workId: state.job ? jobId : '',
    sheet: state.sheet || '',
    intent: state.sheet && state.sheet !== 'again' ? 'generate' : '',
    email: state.email || '',
    fileError: state.fileError || '',
    textError: state.textError || '',
    originalId: state.sheet === 'again' ? jobId : '',
    orderId: state.payment ? orderId : '',
  };
}
