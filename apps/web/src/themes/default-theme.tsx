import {createTheme} from "@mui/material";

// todo: find a way to replace this with dynamic imports
import bg0 from '../assets/404/bg0.jpeg';
import bg1 from '../assets/404/bg1.jpeg';
import bg2 from '../assets/404/bg2.jpeg';
import bg3 from '../assets/404/bg3.jpeg';
import bg4 from '../assets/404/bg4.jpeg';

import poster0 from '../assets/landing/poster0.jpeg';
import poster1 from '../assets/landing/poster1.jpeg';
import poster2 from '../assets/landing/poster2.jpeg';
import poster3 from '../assets/landing/poster3.jpeg';
import poster4 from '../assets/landing/poster4.jpeg';

const backgrounds = [bg0, bg1, bg2, bg3, bg4];
const posters = [poster0, poster1, poster2, poster3, poster4];


export const defaultTheme = createTheme({
  palette: {
    backgrounds: {
      notFound: backgrounds[Math.random() * backgrounds.length | 0],
      landing: posters[Math.random() * posters.length | 0]
    }
  },
  typography: {
    caption: {
      // gothic
      fontFamily: 'fantasy, Blackletter, Old English Text MT, Lucida Blackletter, Gothic, serif',
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => {
        return {
          html: {height: "100%"},
          body: {minHeight: "100%", margin: 0},

          ".not-found": {
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url(${theme.palette.backgrounds.notFound})`,
            "&__text": {
              fontWeight: theme.typography.fontWeightBold,
              color: theme.palette.primary.contrastText,
              textShadow: theme.shadows[1],
            },
            // Link also should be styled a bit differently to be visible on the background:
            "& a": {
              color: theme.palette.secondary.light,
              textShadow: theme.shadows[2]
            },
          },

          ".landing": {
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundImage: `url(${theme.palette.backgrounds.landing})`,

            // .landing__box should be positioned at the bottom right corner
            "&__box": {
               position: "fixed",
               right: theme.spacing(3),
               bottom: theme.spacing(3),
               display: "flex",
               flexDirection: "column",
               gap: 1,
               alignItems: "flex-end",
               pointerEvents: "auto",

              "& .gothic": {
                fontFamily: theme.typography.caption.fontFamily,
                fontSize: theme.typography.h3.fontSize,
                // color is gold with strong shadow
                color: theme.palette.warning.contrastText,
                textShadow: theme.shadows[0]
              }
            }
          },


        }
      }
    }
  }
});


