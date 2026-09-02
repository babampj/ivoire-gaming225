'use client'
import { useState } from 'react';
import { Button } from '@/components/shared/button';
import { Input } from '@/components/shared/input';
import { useAuth, getErrorMessage } from '@/lib/stores/auth';
import { api } from '@/lib/services';

type Mode = 'login' | 'register' | 'forgot';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  return (
    <div className="flex min-h-full flex-col">
      {mode === 'login' ? (
        <Login onSwitch={() => setMode('register')} onForgot={() => setMode('forgot')} />
      ) : null}
      {mode === 'register' ? <Register onSwitch={() => setMode('login')} /> : null}
      {mode === 'forgot' ? <Forgot onBack={() => setMode('login')} /> : null}
    </div>
  );
}

function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-3xl text-4xl">
        🎮
      </div>
      <p className="text-center text-xs font-black tracking-[4px] text-[#ff7a1a]">IVOIRE GAMING</p>
      <h1 className="mt-2 text-center text-[28px] font-black text-[#f5f5fa]">{title}</h1>
      <p className="mt-0.5 text-center text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Login({ onSwitch, onForgot }: { onSwitch: () => void; onForgot: () => void }) {
  const { login, connecting } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await login(identifier.trim(), password);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 pb-8">
      <AuthHeader title="Bienvenue, gamer !" subtitle="La communauté gaming de Côte d'Ivoire." />
      <div className="mt-4">
        <Input
          label="E-mail ou pseudo"
          placeholder="ex : kader@ivoiregaming.ci"
          autoCapitalize="none"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <Input
          label="Mot de passe"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {error ? <p className="mb-3 text-center text-sm text-[#ef4444]">{error}</p> : null}
        <Button title="Se connecter" onPress={submit} loading={connecting} />
        <button type="button" onClick={onForgot} className="mt-4 w-full text-center text-sm font-medium text-[#7c5cfc]">
          Mot de passe oublié ?
        </button>
      </div>
      <div className="mt-6 flex justify-center pb-2">
        <span className="text-sm text-muted-foreground">Pas de compte ? </span>
        <button type="button" onClick={onSwitch} className="ml-1 text-sm font-bold text-[#ff7a1a]">
          Inscris-toi
        </button>
      </div>
    </div>
  );
}

function Register({ onSwitch }: { onSwitch: () => void }) {
  const { register, connecting } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    try {
      await register({ username: username.trim(), email: email.trim(), password, city: city.trim() });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 pb-8">
      <AuthHeader title="Créer ton compte" subtitle="Rejoins les gamers ivoiriens." />
      <div className="mt-4">
        <Input label="Pseudo" placeholder="ex : Kader_99" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="E-mail" placeholder="ex : kader@mail.ci" autoCapitalize="none" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Ville" placeholder="ex : Abidjan" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="Mot de passe" placeholder="Min. 8 caractères" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="mb-3 text-center text-sm text-[#ef4444]">{error}</p> : null}
        <Button title="Créer mon compte" onPress={submit} loading={connecting} />
        <p className="mt-1 text-center text-xs text-[#62627a]">Ensuite, choisis jusqu'à 3 jeux favoris 🎯</p>
      </div>
      <div className="mt-6 flex justify-center pb-2">
        <span className="text-sm text-muted-foreground">Déjà un compte ? </span>
        <button type="button" onClick={onSwitch} className="ml-1 text-sm font-bold text-[#ff7a1a]">
          Connecte-toi
        </button>
      </div>
    </div>
  );
}

function Forgot({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center px-6 pb-8">
      <AuthHeader title="Mot de passe oublié" subtitle="On t'envoie un e-mail de réinitialisation." />
      <div className="mt-4">
        {sent ? (
          <p className="mb-3 text-center text-sm leading-5 text-[#1fa35b]">
            Si cet e-mail existe, un lien de réinitialisation vient d'être envoyé. 📬
          </p>
        ) : (
          <>
            <Input label="E-mail" placeholder="ton@mail.ci" autoCapitalize="none" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error ? <p className="mb-3 text-center text-sm text-[#ef4444]">{error}</p> : null}
            <Button title="Envoyer le lien" onPress={submit} loading={loading} />
          </>
        )}
        <button type="button" onClick={onBack} className="mt-4 w-full text-center text-sm font-medium text-[#7c5cfc]">
          ← Retour à la connexion
        </button>
      </div>
    </div>
  );
}
