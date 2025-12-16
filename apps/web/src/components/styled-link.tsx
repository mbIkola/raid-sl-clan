import { LinkProps as MuiLinkProps } from '@mui/material/Link';
import { styled } from '@mui/material/styles';
import {RouterMuiLink} from "./router-mui-link";

export type StyledLinkProps = MuiLinkProps;

// Base styled link that preserves polymorphic `component` prop typing
export const StyledLink = styled(RouterMuiLink)(({ theme }) => ({
  fontFamily: theme.typography.caption?.fontFamily,
  fontSize: theme.typography.h3.fontSize,
  color: theme.palette.primary.contrastText,
  textShadow: (theme as any).customShadows?.text?.strong,
}));
