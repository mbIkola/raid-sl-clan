import * as React from 'react';
import MuiLink, { LinkProps as MuiLinkProps } from '@mui/material/Link';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

export type RouterMuiLinkProps = MuiLinkProps & RouterLinkProps;

export const RouterMuiLink = React.forwardRef<HTMLAnchorElement, RouterMuiLinkProps>(
  function RouterMuiLink(props, ref) {
    return <MuiLink ref={ref} component={RouterLink} {...props} />;
  }
);

