import { useState, useRef } from 'react';
import { useApp } from '../context';
import type { User, PaymentRequest } from '../store';
import { fmt, fmtDateGroupKey, fmtTime, initials, avatarColor } from '../utils';
import PINInput from '../components/PINInput';

type SendStep = 'user' | 'amount' | 'success';

export default function RequestMoneyScreen() {
  const app = useApp();
  const user = app.getCurrentUser()!;
  const [tab, setTab] = useState<'send' | 'incoming'>('send');
  const processingRef = useRef(false);

  // Send request state
  const [sendStep, setSendStep] = useState<SendStep>('user');
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [createdReq, setCreatedReq] = useState<PaymentRequest | null>(null);

  // Accept flow state
  const [acceptingReqId, setAcceptingReqId] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');

  const allRequests = app.getPaymentRequestsForCurrentUser();
  const incoming = allRequests.filter(r => r.payerId === user.id && (r.status === 'Pending' || r.status === 'PENDING'));
  const myRequests = allRequests.filter(r => r.requesterId === user.id);
  const results = app.searchUsers(query);

  const handleSendRequest = () => {
    const n = parseFloat(amount);
    if (!n || !recipient || processingRef.current) return;
    processingRef.current = true;
    const req = app.createPaymentRequest({ payerId: recipient.id, amount: n, note });
    setCreatedReq(req);
    setSendStep('success');
    processingRef.current = false;
  };

  const handleAcceptPIN = (pin: string) => {
    if (!acceptingReqId || processingRef.current) return;
    processingRef.current = true;
    const result = app.acceptPaymentRequest(acceptingReqId, pin);
    processingRef.current = false;
    if (result.success) {
      setAcceptingReqId(null);
      setPinError('');
    } else {
      setPinError(result.error ?? 'Failed to accept request');
    }
  };

  const handleDeclineRequest = (reqId: string) => {
    app.rejectPaymentRequest(reqId);
  };

  const amountNum = parseFloat(amount) || 0;

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-slate-50 overflow-x-hidden box-border mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-0 w-full max-w-full flex-shrink-0 box-border">
        <div className="flex items-center gap-3 mb-3 w-full">
          <button onClick={app.goBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1 truncate">Request Money</h1>
        </div>

        <div className="flex w-full">
          {(['send', 'incoming'] as ('send' | 'incoming')[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-400'
              }`}
            >
              {t === 'send' ? 'Send Request' : `Incoming (${incoming.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'send' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-full box-border mx-auto">
          {sendStep === 'user' && (
            <div className="w-full max-w-full box-border">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Select PayVerse User</p>
              <input
                type="text"
                placeholder="Search by name, ID or phone..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white text-sm box-border"
              />
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm w-full max-w-full box-border">
                {(query ? results : app.state.users.filter(u => u.id !== user.id)).map((u, i, arr) => (
                  <button
                    key={u.id}
                    onClick={() => { setRecipient(u); setSendStep('amount'); setQuery(''); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors ${i !== arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColor(u.name)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-sm">{initials(u.name)}</span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-gray-900 font-semibold text-sm truncate">{u.name}</p>
                      <p className="text-gray-400 text-xs truncate">{u.id}</p>
                    </div>
                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-xl flex-shrink-0">Select</span>
                  </button>
                ))}
              </div>

              {myRequests.length > 0 && (
                <div className="mt-6 w-full max-w-full box-border">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sent Requests</p>
                  <div className="space-y-2 w-full max-w-full">
                    {myRequests.slice(0, 5).map(r => (
                      <RequestCard key={r.id} req={r} fromMe />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {sendStep === 'amount' && recipient && (
            <div className="w-full max-w-full box-border">
              <div className="bg-white rounded-2xl p-4 flex items-center gap-3 mb-4 border border-gray-100 shadow-sm w-full max-w-full box-border">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarColor(recipient.name)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold">{initials(recipient.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{recipient.name}</p>
                  <p className="text-gray-400 text-xs truncate">{recipient.id}</p>
                </div>
                <button onClick={() => { setRecipient(null); setSendStep('user'); }} className="text-violet-600 text-sm font-semibold flex-shrink-0">Change</button>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-4 w-full max-w-full box-border">
                <p className="text-gray-500 text-sm mb-3 font-medium">Enter Amount</p>
                <div className="flex items-center border-2 border-violet-500 bg-violet-50/50 rounded-2xl px-4 py-3 w-full min-w-0 box-border">
                  <span className="text-2xl font-black text-gray-700 mr-2 flex-shrink-0">₹</span>
                  <input type="tel" inputMode="numeric" placeholder="0" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} autoFocus className="flex-1 min-w-0 w-full text-2xl font-black text-gray-900 bg-transparent focus:outline-none placeholder-gray-300" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 w-full max-w-full box-border">
                <p className="text-gray-400 text-xs mb-1 font-medium">Optional Note</p>
                <input type="text" placeholder="What is this request for? (e.g. Lunch, Rent)" value={note} onChange={e => setNote(e.target.value)} className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none box-border" maxLength={100} />
              </div>

              <button onClick={handleSendRequest} disabled={!amountNum} className="w-full max-w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-200 active:scale-95 transition-transform disabled:opacity-50 text-sm box-border">
                Create Request {amountNum ? fmt(amountNum) : ''}
              </button>
            </div>
          )}

          {sendStep === 'success' && createdReq && (
            <div className="flex flex-col items-center py-6 w-full max-w-full box-border">
              <div className="animate-scale-in mb-4 flex-shrink-0">
                <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth={2.5}>
                    <path className="animate-checkmark" d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-900 font-bold text-xl mb-1 text-center">Request Created!</p>
              <p className="text-gray-500 text-sm mb-6 text-center">Requested <strong>{fmt(createdReq.amount)}</strong> from <strong>{createdReq.payerName}</strong></p>
              
              <div className="w-full max-w-full bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm space-y-3 box-border">
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-400 text-xs">Request ID</span>
                  <span className="text-gray-700 text-xs font-mono font-bold">{createdReq.id}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-400 text-xs">Status</span>
                  <span className="text-amber-700 text-xs font-bold bg-amber-100 px-2.5 py-0.5 rounded-lg">Pending</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-400 text-xs">Requester</span>
                  <span className="text-gray-900 text-xs font-semibold">{createdReq.requesterName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-400 text-xs">Requested From</span>
                  <span className="text-gray-900 text-xs font-semibold">{createdReq.payerName}</span>
                </div>
                {createdReq.note && (
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <span className="text-gray-400 text-xs">Note</span>
                    <span className="text-gray-900 text-xs font-medium truncate max-w-[60%] text-right">{createdReq.note}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">Created At</span>
                  <span className="text-gray-500 text-xs">{fmtDateGroupKey(createdReq.createdAt)} • {fmtTime(createdReq.createdAt)}</span>
                </div>
              </div>

              {/* Demo Action Helper */}
              <div className="w-full max-w-full bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-6 text-center box-border">
                <p className="text-violet-900 font-bold text-xs mb-1">Demo Mode Tip</p>
                <p className="text-violet-600 text-xs mb-3">Switch active demo user to <strong>{createdReq.payerName}</strong> to accept or reject this request.</p>
                <button
                  onClick={() => {
                    app.switchDemoUser(createdReq.payerId);
                    setTab('incoming');
                  }}
                  className="bg-violet-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-transform"
                >
                  Switch to {createdReq.payerName} & Respond
                </button>
              </div>

              <button
                onClick={() => { setSendStep('user'); setAmount(''); setNote(''); setCreatedReq(null); setRecipient(null); }}
                className="text-violet-600 font-bold text-sm"
              >
                Make Another Request
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'incoming' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 w-full max-w-full box-border mx-auto">
          {acceptingReqId && (
            <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm animate-fade-slide-up w-full max-w-full box-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900 text-base">Enter PIN to Pay</p>
                  <p className="text-gray-400 text-xs">Confirm transfer from your PayVerse wallet</p>
                </div>
                <button onClick={() => { setAcceptingReqId(null); setPinError(''); }} className="text-gray-400 text-sm font-semibold">Cancel</button>
              </div>
              <PINInput onComplete={handleAcceptPIN} error={pinError} onReset={() => setPinError('')} />
            </div>
          )}

          {incoming.length === 0 ? (
            <div className="text-center py-16 w-full max-w-full box-border">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-700 font-bold">No Pending Incoming Requests</p>
              <p className="text-gray-400 text-xs mt-1">Payment requests sent to {user.name} will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 w-full max-w-full box-border">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending Requests to Pay</p>
              {incoming.map(req => (
                <div key={req.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm w-full max-w-full box-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColor(req.requesterName)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-sm">{initials(req.requesterName)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-bold text-sm truncate">{req.requesterName}</p>
                      <p className="text-gray-400 text-xs">{fmtDateGroupKey(req.createdAt)} • {fmtTime(req.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-gray-900 font-black text-lg">{fmt(req.amount)}</p>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">Pending</span>
                    </div>
                  </div>
                  {req.note && <p className="text-gray-600 text-xs bg-slate-50 rounded-xl px-3 py-2 mb-3 border border-slate-100 truncate">"{req.note}"</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAcceptingReqId(req.id); setPinError(''); }}
                      className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm shadow-md active:scale-95 transition-transform"
                    >
                      Accept & Pay
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 active:scale-95 transition-transform"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {allRequests.filter(r => r.payerId === user.id && r.status !== 'Pending' && r.status !== 'PENDING').length > 0 && (
            <div className="mt-6 w-full max-w-full box-border">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Processed Incoming Requests</p>
              <div className="space-y-2 w-full max-w-full">
                {allRequests.filter(r => r.payerId === user.id && r.status !== 'Pending' && r.status !== 'PENDING').slice(0, 5).map(r => (
                  <RequestCard key={r.id} req={r} fromMe={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, fromMe }: { req: PaymentRequest; fromMe: boolean }) {
  const statusColors: Record<string, string> = {
    Pending: 'text-amber-700 bg-amber-100',
    Accepted: 'text-green-700 bg-green-100',
    Rejected: 'text-red-700 bg-red-100',
    PENDING: 'text-amber-700 bg-amber-100',
    ACCEPTED: 'text-green-700 bg-green-100',
    REJECTED: 'text-red-700 bg-red-100',
  };
  const name = fromMe ? req.payerName : req.requesterName;
  return (
    <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3 border border-gray-100 shadow-sm w-full max-w-full box-border">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-xs">{initials(name)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 text-sm font-semibold truncate">{fromMe ? `Requested from ${name}` : `Request from ${name}`}</p>
        <p className="text-gray-400 text-xs truncate">{fmt(req.amount)}{req.note ? ` • ${req.note}` : ''}</p>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${statusColors[req.status] ?? 'text-gray-600 bg-gray-100'}`}>{req.status}</span>
    </div>
  );
}
