import React from 'react';
import { PrimaryButton } from '@raid/ui';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <PrimaryButton onClick={() => alert('Click!')}>Click me</PrimaryButton>
      <nav>
        <Link to="/about">About</Link>
      </nav>
    </div>
  );
};

