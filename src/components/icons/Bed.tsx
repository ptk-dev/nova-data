import React, { CSSProperties } from "react";
import PropTypes from "prop-types";

type BedProps = {
  style?: CSSProperties;
  color?: string;
  height?: string;
  width?: string;
  cssClasses?: string;
  className?: string;
  title?: string;
  shake?: boolean;
  beat?: boolean;
  rotate?: boolean;
  onClick?: () => void;
};

const Bed: React.FC<BedProps> = ({
  style = {},
  color = "#000000",
  height = "22px",
  width = "22px",
  cssClasses = "",
  className = "",
  title = "",
  shake = false,
  beat = false,
  rotate = false,
  onClick,
}) => {
  const animationStyle: CSSProperties = {
    transform: rotate ? "rotate(360deg)" : undefined,
    animation: shake
      ? "shake 0.5s"
      : beat
      ? "beat 1s infinite"
      : undefined,
  };

  return (
    <div
      style={{
        height,
        width,
        color,
        ...animationStyle,
        ...style,
      }}
      onClick={onClick}
      className={className}
    >
      <svg
        className={cssClasses}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        height="100%"
        width="100%"
      >
        {title && <title>{title}</title>}
        <path d="M432 230.7a79.44 79.44 0 00-32-6.7H112a79.51 79.51 0 00-32 6.69A80.09 80.09 0 0032 304v112a16 16 0 0032 0v-8a8.1 8.1 0 018-8h368a8.1 8.1 0 018 8v8a16 16 0 0032 0V304a80.09 80.09 0 00-48-73.3zM376 80H136a56 56 0 00-56 56v72a4 4 0 005.11 3.84A95.5 95.5 0 01112 208h4.23a4 4 0 004-3.55A32 32 0 01152 176h56a32 32 0 0131.8 28.45 4 4 0 004 3.55h24.46a4 4 0 004-3.55A32 32 0 01304 176h56a32 32 0 0131.8 28.45 4 4 0 004 3.55h4.2a95.51 95.51 0 0126.89 3.85A4 4 0 00432 208v-72a56 56 0 00-56-56z" />
      </svg>
    </div>
  );
};

Bed.propTypes = {
  style: PropTypes.object,
  color: PropTypes.string,
  height: PropTypes.string,
  width: PropTypes.string,
  cssClasses: PropTypes.string,
  className: PropTypes.string,
  title: PropTypes.string,
  shake: PropTypes.bool,
  beat: PropTypes.bool,
  rotate: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Bed;
