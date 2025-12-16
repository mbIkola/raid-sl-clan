import React from 'react';
import { NotFoundRoot, NotFoundText } from './styles';
import {useTranslation} from "react-i18next";
import {StyledLink} from "../../components/styled-link";

export const NotFoundPage: React.FC = () => {
  const {t} = useTranslation();
  return (
    <NotFoundRoot>
      <NotFoundText>404</NotFoundText>
      <NotFoundText>{t('not found')}</NotFoundText>
      <StyledLink to={"/"} underline={"hover"}>
        {t('back to main')}
      </StyledLink>
    </NotFoundRoot>
  );
};
