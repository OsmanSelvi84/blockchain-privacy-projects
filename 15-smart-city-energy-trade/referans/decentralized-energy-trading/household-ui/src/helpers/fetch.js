export const fetchFromEndpoint = async endpoint => {
  const hhsPort = process.env.REACT_APP_HSS_PORT || 4002;
  const response = await fetch(`http://localhost:${hhsPort}${endpoint}`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`${endpoint} failed with status ${response.status}`);
  }
  return response.json();
};
