import {styled} from '@mui/material/styles';
import {Box} from '@mui/material';

export const LandingRoot = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundImage: `url(${(theme.palette as any).backgrounds?.landing})`,
}));

export const LandingBox = styled(Box)(({ theme }) => ({
  position: 'fixed',
  right: theme.spacing(3),
  bottom: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  alignItems: 'flex-end',
  pointerEvents: 'auto',
}));
