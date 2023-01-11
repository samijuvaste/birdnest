const Pilot = ({ pilot }) => {
    //console.log(Date.parse(pilot.createdAt))
    return (
        <li>
            <h3>{ pilot.name }</h3>
            <ul>
                <li>Email: { pilot.email }</li>
                <li>Phone number: { pilot.phoneNumber }</li>
                <li>Closest confirmed distance: { pilot.distance } m</li>
            </ul>
        </li>
    )
}

export default Pilot