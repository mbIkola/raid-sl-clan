import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import {Link as RouterLink} from "react-router-dom";
import {Box, Slide, Link as MuiLink, useTheme} from "@mui/material";


export const LandingPage = () => {
  const [links, setLinks] = useState([
    {label: 'stats', target: '/dashboard'},
    {label: 'login', target: '/login'},
    {label: 'about', target: '/about'}
  ]);
  const [linksVisibility, updateLinksVisibility] = useState<Array<Boolean>>(links.map(() => false));

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


  // on the bottom right corner, in one column,
  // display links appearing one by one styled with gothic font
  // --> stats
  // --> login
  // --> about
  return <div className={"page landing"}>

    <Box className={"landing__box"}>
      {links.map((link, index) => (
        <Box key={link.target} sx={{display: 'flex', minHeight: theme.typography.h3.fontSize}}>
          <Slide in={!!linksVisibility[index]}
                 direction="left"
                 timeout={{enter: enterDuration, exit: exitDuration}}
                 easing={{
                   enter: theme.transitions.easing.easeOut,
                   exit: theme.transitions.easing.sharp
                 }}
          >
            <MuiLink component={RouterLink}
                     to={link.target}
                     underline={"hover"}
                     className={"gothic"}
            >
              {t(link.label)}
            </MuiLink>
          </Slide>
        </Box>
      ))}
    </Box>
  </div>
}
