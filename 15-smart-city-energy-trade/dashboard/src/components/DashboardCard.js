import React from "react";
import { Box, Heading, Text } from "grommet";

export default function DashboardCard({
  title,
  subtitle,
  icon,
  accent = "brand",
  children,
  flex,
  minHeight
}) {
  const iconBg = accent === "accent-1" ? "#ecfdf5" : "#e6f7f7";
  const iconColor = accent === "accent-1" ? "#059669" : "#0a6b6f";

  return (
    <Box
      background="white"
      round="large"
      border={{ color: "card-border", size: "1px" }}
      pad="medium"
      flex={flex}
      elevation="medium"
      style={{ minHeight }}
    >
      <Box
        direction="row"
        align="center"
        gap="small"
        margin={{ bottom: "medium" }}
        pad={{ bottom: "small" }}
        border={{ side: "bottom", color: "light-3" }}
      >
        {icon && (
          <Box
            align="center"
            justify="center"
            round="medium"
            style={{
              background: iconBg,
              color: iconColor,
              minWidth: 40,
              minHeight: 40,
              flexShrink: 0
            }}
          >
            {icon}
          </Box>
        )}
        <Box>
          <Heading level={4} margin="none" color="dark-1">
            {title}
          </Heading>
          {subtitle && (
            <Text size="xsmall" color="dark-4" margin={{ top: "2px" }}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>
      {children}
    </Box>
  );
}
