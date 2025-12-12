import {createTheme} from "@mui/material";

// todo: find a way to replace this with dynamic imports
import bg0 from '../assets/404/bg0.jpeg';
import bg1 from '../assets/404/bg1.jpeg';
import bg2 from '../assets/404/bg2.jpeg';
import bg3 from '../assets/404/bg3.jpeg';
import bg4 from '../assets/404/bg4.jpeg';

const backgrounds = [bg0, bg1, bg2, bg3, bg4];


export const defaultTheme = createTheme({
  palette: {
    backgrounds: {
      notFound: backgrounds[Math.random() * 4 | 0]
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => {
        console.log("styles recalculated");
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
          }
        }
      }
    }
  }
});


