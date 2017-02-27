<?php

include('../db.php');

// Connect to the database server
ini_set("mysqli.default_socket","/tmp/mysql.sock");
$db = mysqli_connect($server,$dbUserName,$dbUserPass,$dbName);

if (mysqli_connect_errno()) {
    print '<p class="alert alert-error">Oh, dear. The connect failed: ' . mysqli_connect_error() . '. Please email philipp.grunewald@ouce.ox.ac.uk about it.</p>';
    exit();
}

<<<<<<< HEAD
=======
$actColours = array( 'care_self'=>'#cec', 'care_other'=>'#ace', 'care_house'=>'#eda', 'recreation'=>'#ece', 'travel'=>'#eea', 'food'=>'#cea', 'work'=>'#cde', 'other_category'=>'#eec');
>>>>>>> 40d575df860689c11289ab3dc51050eb2f559526



//SINGLE HOUSEHOLD
// ////$householdID = $_GET[hh];
//$householdID = 8365;
//$output = get_household_electricity_activities($db, $householdID);

//MULTIPLE HOUSEHOLDS
// $householdIDs = array(8365, 8285);
// $output = array();
// foreach($householdIDs as $HH_ID) {
//   $output_HH = get_household_electricity_activities($db, $HH_ID);
//   $HHid = array('HHid' => $HH_ID);
//   $output[] = array_merge($output_HH,$HHid);
// }

//MULTIPLE HOUSEHOLDS BASED ON A QUERY
$sqlq= "SELECT distinct(Household_idHousehold) from Activities, Meta where Activities.Meta_idMeta = Meta.idMeta and category is not null";
$q =  mysqli_query($db,$sqlq);
$output = array();
while($HH = mysqli_fetch_assoc($q)) {
  $HH_ID = $HH['Household_idHousehold'];
  $output_HH = get_household_electricity_activities($db, $HH_ID);
  if (is_null($output_HH) === false) {
    $HHid = array('hhID' => $HH_ID);
    $output[] = array_merge($output_HH,$HHid);
  }
<<<<<<< HEAD
}





echo json_encode($output);
mysqli_close($db);








//FUNCTIONS TO QUERY DATABASE
function get_household_electricity_activities($database, $HH_ID) {
  $output_HH = array();

  $sqlq = "SELECT idMeta FROM Meta WHERE Household_idHousehold = '" . $HH_ID . "' AND DataType = 'A'";
  if (!mysqli_query($database,$sqlq)) {
    $output_HH = array('Error Message'=>'Failed at querying Activity MetaID for the given household.');
    //die('I am sorry - something went wrong. Please email philipp.grunewald@ouce.ox.ac.uk.!!  ' . mysqli_error());
  } else {
    $r_user =  mysqli_query($database,$sqlq);

    //ACTIVITIES
    while($userID = mysqli_fetch_assoc($r_user)) {
      $this_metaID = $userID['idMeta'];
      $act = get_user_activities($database, $this_metaID);
      if (is_null($act) === false) {
        $output_HH["users"][] = $act;//this will be an array of length 1 (hopefully!)
      }
=======
else
{
   $r_user =  mysqli_query($db,$sqlq);
   $output = array();
   $userCount = 0;
   while($userID = mysqli_fetch_assoc($r_user)) {

        $sqlq = "SELECT idActivities,dt_activity,activity,location,enjoyment,category FROM Activities WHERE Meta_idMeta = ". $userID['idMeta'];
        $r_act =  mysqli_query($db,$sqlq);
        $activities = array();
        while($act = mysqli_fetch_assoc($r_act)) {
            $loc = $act['location'];
            $act['location_label'] = $actLocation[$loc];
            $act['period'] = substr_replace($act['dt_activity'],'0:00',-4);
            $cat = $act['category'];
            if ($cat == '') { $cat = 'other_category';}
            $act['dotcolour'] = $actColours[$cat];
            $activities[] = $act;
        }
        $userActivities = array('activities'=>$activities);
        $userColour = array('dotcolour'=>$dotcolours[$userCount]);
        $userLabel  = array('label'    =>$labels[$userCount]);
        $userEntry = array_merge($userID,$userLabel,$userColour,$userActivities);
        $output["users"][] = $userEntry; // idMeta
        $userCount +=1;
>>>>>>> 40d575df860689c11289ab3dc51050eb2f559526
    }

    //ELECTRICITY
    $sqlq = "SELECT idMeta FROM Meta WHERE Household_idHousehold = '" . $HH_ID . "' AND DataType = 'E'";
    if (!mysqli_query($database,$sqlq)) {
        $output_HH = array('Error Message'=>'Failed at querying Electricity MetaID for the given household.');
        //die('I am sorry - something went wrong. Please email philipp.grunewald@ouce.ox.ac.uk.!!  ' . mysqli_error());
    } else {
      $r_elec_readings =  mysqli_query($database,$sqlq);

      while($readingID = mysqli_fetch_assoc($r_elec_readings)) {
        $this_metaID = $readingID['idMeta'];
        $el = get_household_electricity($database, $this_metaID);
        if (is_null($el) === false) {
          $output_HH["readings"][] = $el;
        }
      }
    }
  }

  //check whether it has at least some activity and electricity
  if ( (sizeof($output_HH["users"]) > 0) && (sizeof($output_HH["readings"]) > 0) ) {
    return $output_HH;
  } else {
   return NULL;
  }
}    

//returns array or NULL
function get_household_electricity($database, $metaID) {
    //1 min readings
    $sqlq = "SELECT dt,Watt FROM Electricity_1min WHERE Meta_idMeta = " . $metaID;
    $r_eReading =  mysqli_query($database,$sqlq);
    $dt = array();
    $Watt = array();
    while($eReading = mysqli_fetch_assoc($r_eReading)) {
        $dt[] = $eReading['dt'];
        $Watt[] = $eReading['Watt'];
    }
    $time = array('time'=>$dt);
    $power = array('Watt'=>$Watt);

    //check if want this data
    if (sizeof($Watt) > 0) { //or power..
      $elID = array('metaID'=>$metaID); //user defined by that metaID
      $electricityEntry = array_merge($elID, $time, $power);
    } else {
      $electricityEntry = NULL;
    }

    return $electricityEntry;
}

//returns array or NULL
function get_user_activities($database, $metaID) {
  $actLocation = array( '1'=>'Home', '2'=>'Travelling', '3'=>'At work', '4'=>'Public place', '5'=>'Outdoors', '6'=>'Garden', '7'=>'Somewhere else'); //has to be inside the function...
  $sqlq = "SELECT idActivities,dt_activity,activity,location,enjoyment,category FROM Activities WHERE Meta_idMeta = ". $metaID;
  $r_act =  mysqli_query($database, $sqlq);
  $activities = array();
  while($act = mysqli_fetch_assoc($r_act)) {
      $loc = $act['location'];
      $act['location_label'] = $actLocation[$loc];
      $activities[] = $act;
  }

  //check if want this data
  if (sizeof($activities) > 0) {
    $userID = array('metaID'=>$metaID); //user defined by that metaID
    $userActivities = array('activities'=>$activities);
    $userEntry = array_merge($userID,$userActivities);
  } else {
   $userEntry = NULL;
  }

  return $userEntry;
}


?>
