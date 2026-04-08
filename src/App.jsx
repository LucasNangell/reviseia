import React, { useState } from 'react';
import Landing from './Landing';
import Dashboard from './Dashboard';
import SignUp from './SignUp';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('landing');
  const [loggedInUser, setLoggedInUser] = useState(null);

  if (currentRoute === 'app') {
    return <Dashboard user={loggedInUser} onNavigateBack={() => { setLoggedInUser(null); setCurrentRoute('landing'); }} />;
  }

  if (currentRoute === 'signup') {
    return <SignUp onSuccess={(user) => { setLoggedInUser(user); setCurrentRoute('app'); }} onBack={() => setCurrentRoute('landing')} />;
  }

  return <Landing onEnterApp={() => setCurrentRoute('signup')} />;
}
