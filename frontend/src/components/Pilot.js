const Pilot = ({ pilot }) => {
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