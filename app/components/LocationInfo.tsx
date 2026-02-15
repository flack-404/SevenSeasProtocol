import { useThirdweb } from "../libs/hooks/useThirdweb";
import { Icon } from "./Icons";
import { Ship } from "./ShipArea";

export const LocationInfo = ({
  location,
  ships,
  isTraveling,
}: {
  location: number;
  ships: Ship[];
  isTraveling: boolean;
}) => {
  const { address } = useThirdweb();
  const shipsNearby = ships.filter(
    (ship) => ship.address.toLowerCase() !== address?.toLowerCase()
  );
  return (
    <div className="text-center mb-4 fixed top-[40px] left-1/2 transform -translate-x-1/2">
      {isTraveling ? <div className="ui2  flex items-center gap-2 p-5 text-white"> Traveling...</div> : <div className="ui2  flex items-center gap-2 p-5 text-white">
        <Icon iconName="pin" /> Coordinate {location}
        {[25, 55, 89].includes(location) && (
          <span className="text-blue-400 ml-2">⚓ PORT</span>
        )}
        <span className="text-gray-300 ml-2">
          • {shipsNearby.length} ship{shipsNearby.length !== 1 ? "s" : ""}{" "}
          nearby
        </span>
      </div>}
    </div>
  );
};
