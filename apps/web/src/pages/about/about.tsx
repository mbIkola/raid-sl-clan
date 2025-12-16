import React from 'react';
import {HeadTitle} from "../../core/HeadMeta";
import {useTranslation} from "react-i18next";

export const About: React.FC = () => {
  const {t} = useTranslation();

  return <>
      <HeadTitle title={t('about')}/>
      <h2>{t('about')}</h2>
    </>
};

