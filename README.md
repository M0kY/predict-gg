# Predict-GG

The goal of this project is to gather League of Legends games data from the Riot Games API and use it to train a neural network classifier. The trained model is then used to predict live League of Legends games.

## Getting Started

Make a local copy of this repo: `https://github.com/M0kY/predict-gg.git`  
Setup a MongoDB database either on your local machine or remote https://cloud.mongodb.com.

Create a collection named `gamestats` and import the data from `./dataset/gamestats.json`. If you want to gather your own data simply follow the instruction below on how to collect training data.

Inside the folder of your local repo run  
```
npm install
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
  goldPerMinDeltas[0-10]
  goldPerMinDeltas[10-20]
  creepsPerMinDeltas[0-10]
  creepsPerMinDeltas[10-20]
  xpPerMinDeltas[0-10]
  xpPerMinDeltas[10-20]
  damageTakenPerMinDeltas[0-10]
  damageTakenPerMinDeltas[10-20]
  numberOfGames
```

From the dataset `10` items are used for testing the model while the rest are used for training. This is defined by the `TEST_BATCH_SIZE` variable.

## Basic Usage

First collect the training data by running  
```
npm start
```

There is a limit to the number of available API call that can be made in a specific timeframe. It is possible to run multiple instances of the script for different regions since the limit is region based. The average time to collect a single game with the default settings is ~7 mins.

When there is a big enough collection of gathered games train the classifier by running

```
npm run classify
```

With the trained model it is now possible to predict a live game by running the following script with the **region** and **summonerName** arguments.

```
npm run livegame "region" "summonerName"
```

## Conclusion

It seems high ranking games are harder to predict then lower ones. This could be due to the fact on high levels of play players generally know the capabilites of the champion they play and thus perform decently in most cases. In such games team play and individual decison making take the spotlight and raw stats fall behind. However more testing is needed to confirm these claims.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
