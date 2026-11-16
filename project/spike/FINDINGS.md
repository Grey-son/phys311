I attempted to implement circle-circle collisions and golf shot logic.

Ultimately, this was very easy to implement, however it illuminated the fact
that I need to add surface friction as well, with a similar check for parallel
velocity greater than a given epsilon. Otherwise, the golf ball will always have
some velocity and will not stop.

Therefore, I will be adding surface friction into the MUST category.

Additionally, I did not attempt to implement the trajectory accurate aim curve. My
idea for implementing this is to simulate a ghost ball for some set time once per
frame whilst aiming, then rendering the trajectory of that ghost ball in the same
frame.