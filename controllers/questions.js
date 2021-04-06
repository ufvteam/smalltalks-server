const ThrowError = require('../utils/throwError');
const Question = require('../models/questions');

/**
 * @description     Get All public questions
 * @route           GET /api/v1/questions
 * @access          Public
 */
exports.getQuestions = async (req, res, next) => {
  try {
    const questions = await Question.findAll();
    res.status(200).json({
      success: true,
      data: questions,
      msg: 'Show all questions',
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      msg: 'Could not fetch questions',
    });
  }
};

/**
 * @description     Get single question
 * @route           GET /api/v1/questions/:id
 * @access          Public
 */
exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (question.length === 0)
      return next(
        new ThrowError(`Question not found with id of ${req.params.id}`, 404)
      );
    res.status(200).json({
      success: true,
      data: question,
      msg: `Show question ${req.params.id}`,
    });
  } catch (error) {
    // res.status(404).json({
    //   sucess: false,
    //   msg: `Question is not found with the id of ${req.params.id}`,
    // });
    next(new ThrowError(`Question not found with id of ${req.params.id}`, 404));
  }
};

/**
 * @description     Create new question
 * @route           GET /api/v1/questions
 * @access          Private
 */
exports.createQuestion = async (req, res, next) => {
  try {
    // Add the current logged in user to body => Will do after implementing the authentication
    // req.body.userId = req.user.id;
    req.body.userId = 1;
    const insertId = await Question.create(req.body);
    const foundQuestion = await Question.findById(insertId);
    if (foundQuestion) {
      res.status(200).json({
        success: true,
        data: foundQuestion,
        msg: 'Question successfully created!',
      });
    } else throw error();
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: 'Could not create a question!',
    });
  }
};

/**
 * @description     Update the question
 * @route           PUT /api/v1/questions/:id
 * @access          Private - Only owner or admin
 */
exports.updateQuestion = async (req, res, next) => {
  try {
    req.user = 1; // req.user.id will be from authentication later on
    const question = await Question.findById(req.params.id);

    if (!question)
      return res
        .status(404)
        .json({ success: false, msg: `Question is not found` });

    // Check if the question author
    if (question.postedBy.userId != req.user) throw new error();

    await Question.findByIdAndUpdate(req.params.id, req.body);

    const updatedQuestion = await Question.findById(req.params.id);
    console.log(updatedQuestion);
    res.status(200).json({
      success: true,
      data: updatedQuestion,
      msg: 'Question with successfully updated!',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: 'Could not update a question!',
    });
  }
};

/**
 * @description     Delete the question
 * @route           DELETE /api/v1/questions/:id
 * @access          Private - Only owner or admin
 */
exports.deleteQuestion = async (req, res, next) => {
  try {
    req.user = 1; // req.user.id will be from authentication later on
    const question = await Question.findById(req.params.id);

    if (!question)
      return res
        .status(404)
        .json({ success: false, msg: `Question is not found` });

    // Check if the question author
    if (question.postedBy.userId != req.user) throw new error();

    await Question.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      data: {},
      msg: 'Question successfully deleted',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      msg: 'Could not delete a question!',
    });
  }
};
