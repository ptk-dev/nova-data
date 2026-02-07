import React, { CSSProperties } from "react";
import PropTypes from "prop-types";

type AnalyticsProps = {
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

const Analytics: React.FC<AnalyticsProps> = ({
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
      className={className}
      onClick={onClick}
    >
      <svg
        className={cssClasses}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        height="100%"
        width="100%"
      >
        {title && <title>{title}</title>}
        <path d="M456 128a40 40 0 00-37.23 54.6l-84.17 84.17a39.86 39.86 0 00-29.2 0l-60.17-60.17a40 40 0 10-74.46 0L70.6 306.77a40 40 0 1022.63 22.63L193.4 229.23a39.86 39.86 0 0029.2 0l60.17 60.17a40 40 0 1074.46 0l84.17-84.17A40 40 0 10456 128z" />
      </svg>
    </div>
  );
};

Analytics.propTypes = {
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

export default Analytics;
