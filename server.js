const express = require('express');
const app = express();


app.get('/leaderboard/:name', async(req, res, next)=> {
  try {
    const game = await Game.findOne({
      where: {
        name: req.params.name
      }
    });
    res.send(await game.leaderboard());
  }
  catch(ex){
    next(ex);
  }
});
const Sequelize = require('sequelize');
const { UUID, UUIDV4, STRING } = Sequelize;
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/the_acme_leaderboard_db');

const { createClient } = require('redis');

const client = createClient();

const User = conn.define('user', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: STRING
  }
});

const Game = conn.define('game', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  name: {
    type: STRING
  }
});

Game.prototype.leaderboard = function(){
  return client.sendCommand([
    'ZREVRANGE',
    `leaderboard-${this.id}`,
    '0',
    '-1',
    'WITHSCORES'
  ]);
}

const Point = conn.define('point', {
  id: {
    type: UUID,
    defaultValue: UUIDV4,
    primaryKey: true
  },
  gameId: {
    type: UUID,
    allowNull: false
  },
  userId: {
    type: UUID,
    allowNull: false
  }
});

Point.addHook('afterCreate', async(point)=> {
  const { name, id } = await User.findByPk(point.userId);
  await client.sendCommand([
    'ZINCRBY',
    `leaderboard-${point.gameId}`,
    '1',
    JSON.stringify({ name, id })
  ]);
});

//User.belongsToMany(Game, { through: 'point'});
//Game.belongsToMany(User, { through: 'point'});
Point.belongsTo(User);
Point.belongsTo(Game);

const init = async()=> {
  try {
    await client.connect();
    await client.flushAll();
    await conn.sync({ force: true });
    const [moe, lucy, larry, game1, game2] = await Promise.all([
      User.create({ name: 'moe'}),
      User.create({ name: 'lucy'}),
      User.create({ name: 'larry'}),
      Game.create({ name: 'game1'}),
      Game.create({ name: 'game2'})
    ]);

    await Promise.all([
      Point.create({ userId: moe.id, gameId: game1.id}),
      Point.create({ userId: larry.id, gameId: game1.id}),
      Point.create({ userId: larry.id, gameId: game1.id}),
      Point.create({ userId: larry.id, gameId: game1.id}),
      Point.create({ userId: larry.id, gameId: game1.id}),
      Point.create({ userId: larry.id, gameId: game1.id}),
      Point.create({ userId: lucy.id, gameId: game1.id}),
      Point.create({ userId: lucy.id, gameId: game1.id}),
      Point.create({ userId: lucy.id, gameId: game1.id}),
      Point.create({ userId: lucy.id, gameId: game1.id}),
      Point.create({ userId: lucy.id, gameId: game2.id}),
      Point.create({ userId: lucy.id, gameId: game2.id}),
    ]);
    console.log(await game1.leaderboard());
    const port = process.env.PORT || 3000;
    app.listen(port, ()=> console.log(`listening on port ${port}`));
  }
  catch(ex){
    console.log(ex);
  }
};

init();
