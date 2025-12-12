import React from 'react';
import ReactDOM from 'react-dom/client';
import { Admin, Resource, ListGuesser } from 'react-admin';
import { dataProvider } from './provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Admin dataProvider={dataProvider}>
      <Resource name="users" list={ListGuesser} />
    </Admin>
  </React.StrictMode>
);

