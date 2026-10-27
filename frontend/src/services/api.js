const BASE=(import.meta.env.VITE_API_BASE_URL||'http://127.0.0.1:8000').replace(/\/$/,'');
async function request(path,options={}){let response;try{response=await fetch(`${BASE}${path}`,{...options,headers:{'Content-Type':'application/json',...options.headers}})}catch(e){throw new Error('Cannot reach NeuralDesk API. Check that the backend is running.')}const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail?.message||body.detail||`Request failed (${response.status})`);return body}
export const predict=text=>request('/predict',{method:'POST',body:JSON.stringify({text})});
export const predictBatch=texts=>request('/predict/batch',{method:'POST',body:JSON.stringify({texts})});
export const getMetrics=()=>request('/metrics');
export const getHealth=()=>request('/health');
export const getConfusionMatrixUrl=()=>`${BASE}/metrics/confusion-matrix`;
