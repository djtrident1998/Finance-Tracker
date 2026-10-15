const form = document.querySelector('#auth-form');
const message = document.querySelector('#message');
const submit = document.querySelector('#submit');
let signup = false;
document.querySelector('#toggle').addEventListener('click', () => {
  signup = !signup;
  document.querySelector('#title').textContent = signup ? 'Start with a clear picture.' : 'Welcome back.';
  document.querySelector('#intro').textContent = signup ? 'Create your private Artha workspace.' : 'Sign in to your private investment space.';
  document.querySelector('#name-field').hidden = !signup;
  document.querySelector('#name-field').classList.toggle('hidden', !signup);
  form.elements.name.required = signup;
  form.elements.password.autocomplete = signup ? 'new-password' : 'current-password';
  submit.textContent = signup ? 'Create account' : 'Sign in';
  document.querySelector('#toggle').textContent = signup ? 'I already have an account' : 'Create an account';
  message.textContent = '';
});
form.addEventListener('submit', async event => {
  event.preventDefault(); submit.disabled = true; message.textContent = '';
  try {
    const values = Object.fromEntries(new FormData(form));
    const result = await fetch('/api/auth/'+(signup?'sign-up/email':'sign-in/email'),{
      method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({...values,callbackURL:location.origin+'/'}),
    });
    const body = await result.json();
    if (!result.ok) throw new Error(body.message || 'Unable to sign in. Please try again.');
    const session = await fetch('/api/auth/get-session',{cache:'no-store'}).then(r=>r.json());
    if (session?.user?.id) location.assign('/');
    else message.textContent = 'Check your email to verify your account, then sign in.';
  } catch (error) {message.textContent=error.message;} finally {submit.disabled=false;}
});
if (new URLSearchParams(location.search).has('signout')) {
  fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(result=>{
    if (!result.ok) throw new Error();
    message.textContent='You are signed out.';history.replaceState(null,'','/login');
  }).catch(()=>{message.textContent='Unable to sign out. Please try again.';});
}
