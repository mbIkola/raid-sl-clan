import React from 'react';
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";

export const NotFoundPage = () => {
  const {t} = useTranslation();
  return <div
    className={`not-found`}
  >
    <h1 className={"not-found__text gothic"}>{t('not found')}</h1>

    <h3><Link className={"gothic"} to={'/'}>{t('back to main')}</Link></h3>
  </div>
}

