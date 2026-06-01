import React from "react";
import PropTypes from "prop-types";
import { Text } from "grommet";

import DashboardBox from "./DashboardBox";
import TransferItem from "./TransferItem";

const TransfersTicker = React.memo(({ transfers = [] }) => {
  return (
    <DashboardBox title={"Transfer Ticker"}>
      {transfers.length === 0 ? (
        <Text alignSelf="center" margin="medium" color="dark-4">
          No transfers yet. Submit sensor data for both households and wait
          ~30s.
        </Text>
      ) : null}
      {transfers.map(transfer => (
        <TransferItem
          key={transfer._id}
          from={transfer.from}
          to={transfer.to}
          amount={Number(transfer.amount)}
          timestamp={transfer.timestamp}
        />
      ))}
    </DashboardBox>
  );
});

TransfersTicker.propTypes = {
  transfers: PropTypes.arrayOf(PropTypes.object)
};

export default TransfersTicker;
