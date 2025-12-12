import React from 'react';
import { Button } from '@mui/material';

export const PrimaryButton: React.FC<React.ComponentProps<typeof Button>> = (props) => {
  return <Button variant="contained" color="primary" {...props} />;
};

