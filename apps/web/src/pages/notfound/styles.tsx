import {styled} from '@mui/material/styles';

export const NotFoundRoot = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundImage: `url(${(theme.palette as any).backgrounds?.notFound})`,
}));

export const NotFoundText = styled('span')(({ theme }) => ({
  fontFamily: theme.typography.caption?.fontFamily,
  fontSize: theme.typography.h3.fontSize,
  fontWeight: theme.typography.fontWeightBold,
  color: theme.palette.error.main,
  textShadow: (theme as any).customShadows?.text?.medium,
}));
