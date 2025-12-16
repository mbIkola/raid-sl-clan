import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import {Box, Slide, useTheme} from "@mui/material";
import { LandingRoot, LandingBox } from './styles';
import {StyledLink} from "../../components/styled-link";


export const LandingPage = () => {
  const [links] = useState([
    {label: 'stats', target: '/dashboard'},
    {label: 'login', target: '/login'},
    {label: 'about', target: '/about'}
  ]);
  const [linksVisibility, updateLinksVisibility] = useState<Array<boolean>>(links.map(() => false));

  const theme = useTheme();
  const {t} = useTranslation();

  const baseDelay = theme.transitions.duration.shorter;            // ~200ms default
  const perItemOffset = Math.round(theme.transitions.duration.shortest / 3); // small step
  const enterDuration = theme.transitions.duration.enteringScreen; // ~225ms default
  const exitDuration = theme.transitions.duration.leavingScreen;   // ~195ms default


  useEffect(() => {
    const timers = links.map((link, index) =>
      setTimeout(
        () => updateLinksVisibility(prev => {
          const next = [...prev];
          next[index] = true;
          return next;
        }),
        baseDelay * (index + 1) + perItemOffset * index
      )
    );

    return () => timers.forEach(clearTimeout);
  }, [links, updateLinksVisibility]);


  return (
    <LandingRoot>
      <LandingBox>
        {links.map((link, index) => (
          <Box key={link.target} sx={{display: 'flex', minHeight: theme.typography.h3.fontSize}}>
            <Slide in={linksVisibility[index]}
                   direction="left"
                   timeout={{enter: enterDuration, exit: exitDuration}}
                   easing={{enter: theme.transitions.easing.easeOut, exit: theme.transitions.easing.sharp }}
            >
              <StyledLink to={link.target} underline="hover">
                {t(link.label)}
              </StyledLink>
            </Slide>
          </Box>
        ))}
      </LandingBox>
    </LandingRoot>
  );
}
