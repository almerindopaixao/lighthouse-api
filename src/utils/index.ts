
interface Position {
    lat: number;
    lng: number;
}

export const getDistanceFromLatLonInKm = (position1: Position, position2: Position) => {
    const R = 6371;
    const deg2rad =  (deg: number) =>  deg * (Math.PI / 180);

    const dLat = deg2rad(position2.lat - position1.lat);
    const dLng = deg2rad(position2.lng - position1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(deg2rad(position1.lat))
            * Math.cos(deg2rad(position1.lat))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
            
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return ((R * c *1000).toFixed());
}