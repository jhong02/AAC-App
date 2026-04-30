/**  
 *   Cloud Background Component 
 *      This component renders a cloud background using CSS. 
 *      It is designed to be used as a background for the application, 
 *      providing a visually appealing and consistent backdrop for the content. 
 *      The clouds are created using CSS gradients and animations to give a dynamic 
 *      and lively effect.
**/

import { useMemo } from "react";
import "./CloudBackground.css";

type CloudConfig = {
  top?: string;
  scale?: number;
  flip?: boolean;
  duration?: number;
  delay?: number;
  direction?: "left" | "right";
};

type Props =
  | {
      mode?: "auto";
      count?: number;
      clouds?: never;
    }
  | {
      mode: "manual";
      clouds: CloudConfig[];
      count?: never;
    };

export default function CloudBackground(props: Props) {

    const clouds = useMemo(() => {
        
        if(props.mode === "manual") {
            return props.clouds;
        }

        const count = props.count ?? 5;

        return Array.from({ length: count }, () => ({
            top: `${Math.random() * 80 + 10}%`,
            duration: (40 + Math.random() * 60), // 40–100s
            delay: (-Math.random() * 60), // negative = already mid-animation
            scale: (0.8 + Math.random() * 1.2),
            flip: Math.random() > 0.5,
            direction: (Math.random() > 0.5 ? "left" : "right"),
        }));

    },  [props.mode, props.count]);

    return (

        <div className="cloud-layer">
          {clouds.map((c, i) => (
            <div    
              key={i}
              className={`cloud ${c.direction === "left" ? "left" : "right"}`}
              style={{
                top: c.top,
                animationDuration: `${c.duration}s`,
                animationDelay: `${c.delay}s`,
                //animationName: c.direction === "left" ? "cloudMoveLeft" : "cloudMove",
              }}
            >

              <div
                className="cloud-inner"
                style={{
                    transform: `
                      scale(${c.scale})
                      ${c.flip ? "scaleX(-1)" : ""}
                    `,
                }}
              />
            </div>
          ))}
        </div>
    );
}



