# Predict-GG

The goal of this project is to gather League of Legends games data from the Riot Games API and use it to train a neural network classifier. The trained model is then used to predict live League of Legends games.

## Getting Started

Make a local copy of this repo: `https://github.com/M0kY/predict-gg.git`  
Setup a MongoDB database either on your local machine or remote https://cloud.mongodb.com.

Create a collection named `gamestats-clean` and import the data from `./dataset/gamestats-clean.json`. If you prefer to import raw data and
prepare it for training yourself create a collection named `gamestats`, import the data from `./dataset/gamestats.json` and run the `cleanup` script.   
For gathering your own data simply follow the instruction below on how to collect training data.

Inside the folder of your local repo run  
```
npm install
```

On Windows you may need to globally install `windows-build-tools`.
```
npm install -g windows-build-tools
```

Create a `.env` file and use `.env.example` as template. Set the database connection info.  
The `RIOT_API_KEY` is required for making API request to the Riot Games API and can be obtained by registering a developer account on http://developer.riotgames.com.  
When gathering data you need to provide a `STARTING_MATCH_ID` and the `BATCH_SIZE` which the script then uses to create a range to loop in. The default value for STARTING_MATCH_ID is a random match played in the `EUROPE_WEST` region and `BATCH_SIZE` is set to `1000`.  
In the end the dataset won't be of the same size as `BATCH_SIZE` due to not all game IDs in the range being valid IDs or the queue type not being `RANKED_5x5_SOLO`.  
By default the stats for each player in a given game are the average of the
last `30` games the player played the same champion. The number of games is defined by `GAMES_PER_PLAYER`.
The collected datapoints for each player are the following:

```
  teamId
  championId
  numberOfGames
  spell1Id
  spell2Id
  championMastery
  gameDuration
  visionScore
  longestTimeSpentLiving
  kills
  damageDealtToObjectives
  totalDamageTaken
  damageSelfMitigated
  assists
  totalDamageDealtToChampions
  visionWardsBoughtInGame
  deaths
  win
  firstBloodAssist
  totalTimeCrowdControlDealt
  tripleKills
  neutralMinionsKilled
  damageDealtToTurrets
  largestMultiKill
  wardsKilled
  largestKillingSpree
  quadraKills
  teamObjective
  neutralMinionsKilledTeamJungle
  firstInhibitorKill
  combatPlayerScore
  largestCriticalStrike
  goldSpent
  objectivePlayerScore
  totalDamageDealt
  neutralMinionsKilledEnemyJungle
  wardsPlaced
  turretKills
  firstBloodKill
  goldEarned
  killingSprees
  unrealKills
  firstTowerAssist
  firstTowerKill
  champLevel
  doubleKills
  inhibitorKills
  firstInhibitorAssist
  pentaKills
  totalHeal
  totalMinionsKilled
  timeCCingOthers
  goldPerMinDeltas[0-10]
  goldPerMinDeltas[10-20]
  creepsPerMinDeltas[0-10]
  creepsPerMinDeltas[10-20]
  xpPerMinDeltas[0-10]
  xpPerMinDeltas[10-20]
  damageTakenPerMinDeltas[0-10]
  damageTakenPerMinDeltas[10-20]
```

From the dataset `10` items are used for testing the model while the rest are used for training. This is defined by the `TEST_BATCH_SIZE` variable.

## Basic Usage

First collect the training data by running  
```
npm start
```

There is a limit to the number of available API call that can be made in a specific timeframe. It is possible to run multiple instances of the script for different regions since the limit is region based. The average time to collect a single game with the default settings is ~7 mins.

When there is a big enough collection of gathered games run the cleanup script to prepare data for training and save it in a new collection named `gamestats-clean`.

```
npm run cleanup
```

To train the classifier run

```
npm run classify
```

With the trained model it is now possible to predict a live game by running the following script with the **region** and **summonerName** arguments.

```
npm run livegame "region" "summonerName"
```

## Conclusion

There are a few really important factors that play a role in the accuracy of the classifier. The main one is the fact the game itself has a matchmaking algorithm implemented. It's goal is to field two teams with close to equal chances of winning. The other factor is the assumption that high ranking games are harder to predict then lower ones. This is due to the fact on high levels of play players generally know the capabilites of the champion they play and thus perform decently in most cases. In such games team play and individual decison making gains more, while raw stats lose influence in the outcome of the game. However more testing is needed to confirm these claims.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
