import React from 'react';
import {PrimaryButton} from '@raid/ui';
import {Link} from 'react-router-dom';
import {HeadTitle} from '../../core/HeadMeta';
import {useTranslation} from "react-i18next";

export const Dashboard: React.FC = () => {
  const {t} = useTranslation();

  return (
    <div>
      <HeadTitle title={t('stats')}/>
      <h1>{t('stats')}</h1>
      <PrimaryButton onClick={() => alert('Click!')}>Click me</PrimaryButton>
      <nav>
        <Link to="/about">{t('about')}</Link>
      </nav>
    </div>
  );
};

